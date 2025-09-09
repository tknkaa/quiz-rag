import { Hono } from "hono";
import { cors } from "hono/cors";
import { QdrantClient } from "@qdrant/js-client-rest";
import { zValidator } from "@hono/zod-validator";
import z from "zod";
import { GoogleGenAI, Type } from "@google/genai";

type Bindings = {
	GEMINI_API_KEY: string;
};

export const app = new Hono<{ Bindings: Bindings }>();
const qdrantClient = new QdrantClient({
	url: "http://localhost:6333",
});

app.use(
	"*",
	cors({
		origin: "http://localhost:5173",
	}),
);

const route = app
	.get("/", (c) => {
		return c.text("Hello Hono!");
	})
	.post(
		"/api/quiz",
		zValidator(
			"form",
			z.object({
				theme: z.string(),
			}),
		),
		async (c) => {
			const { theme } = c.req.valid("form");
			const ai = new GoogleGenAI({
				apiKey: c.env.GEMINI_API_KEY,
			});
			const aiResponse = await ai.models.embedContent({
				model: "gemini-embedding-001",
				contents: theme,
				config: {
					outputDimensionality: 768,
				},
			});
			if (!aiResponse.embeddings) {
				return c.json({
					status: "error",
					message: "Failed to embed the theme",
				});
			}
			const embedding = aiResponse.embeddings[0].values;
			if (!embedding) {
				return c.json({ status: "error", message: "Failed to get vector" });
			}
			const qdrant_res = await qdrantClient.search("utcode_learn", {
				vector: embedding,
				limit: 3,
			});
			const chunks = qdrant_res.map((res) => res.payload?.chunk);
			let prompt = "Create Quiz and answer based on the following fact.\n";
			for (let i = 0; i < chunks.length; i++) {
				prompt += `Fact ${i}: ${chunks[i]}\n`;
			}
			const quiz = await ai.models.generateContent({
				model: "gemini-2.5-flash",
				contents: prompt,
				config: {
					responseMimeType: "application/json",
					responseSchema: {
						type: Type.OBJECT,
						properties: {
							quiz: {
								type: Type.STRING,
							},
							answer: {
								type: Type.STRING,
							},
						},
					},
				},
			});
			if (!quiz.text) {
				return c.json({ status: "error", message: "Failed to generate quiz" });
			}
			const quizJSON: {
				quiz: string;
				answer: string;
			} = JSON.parse(quiz.text);
			console.log(quizJSON);
			return c.json(quiz);
		},
	);

export type AppType = typeof route;

export default app;

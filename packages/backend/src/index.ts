import { Hono } from "hono";
import { cors } from "hono/cors";
import { QdrantClient } from "@qdrant/js-client-rest";
import { zValidator } from "@hono/zod-validator";
import z from "zod";
import { GoogleGenAI } from "@google/genai";

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
				return c.text("Failed to embed the prompt");
			}
			const embedding = aiResponse.embeddings[0].values;
			console.log(embedding);
			if (!embedding) {
				return c.text("Failed to get vector");
			}
			const qdrant_res = await qdrantClient.search("utcode_learn", {
				vector: embedding,
				limit: 3,
			});
			console.log("search result", qdrant_res);
			return c.text("what is the best linux distro?");
		},
	);

export type AppType = typeof route;

export default app;

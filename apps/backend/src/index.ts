import { Hono } from "hono";
import { cors } from "hono/cors";
import { QdrantClient } from "@qdrant/js-client-rest";
import { zValidator } from "@hono/zod-validator";
import z from "zod";
import { GoogleGenAI } from "@google/genai";
import { env } from "hono/adapter";

const app = new Hono();
const client = new QdrantClient({
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
		"/quiz",
		zValidator(
			"form",
			z.object({
				prompt: z.string(),
			}),
		),
		async (c) => {
			const { GEMINI_API_KEY } = env<{ GEMINI_API_KEY: string }>(c);
			const ai = new GoogleGenAI({
				apiKey: GEMINI_API_KEY,
			});
			const aiResponse = await ai.models.embedContent({
				model: "gemini-embedding-001",
				contents: c.req.valid("form").prompt,
			});
			if (!aiResponse.embeddings) {
				return c.json({
					ok: false,
					message: "Failed to get embedding vector",
				});
			}
			const vector = aiResponse.embeddings[0].values;
			if (!vector) {
				return c.json({
					ok: false,
					message: "Failed to get embedding vector",
				});
			}
			// this collection name is defined in db/seed.py
			const vecs = await client.search("utcode_learn", {
				vector: vector,
				limit: 3,
			});
			console.log(vecs);

			return c.json({
				ok: true,
				quiz: "what is the best linux distro?",
			});
		},
	);

export type AppType = typeof route;

export default app;

import { Hono } from "hono";
import { cors } from "hono/cors";
import { QdrantClient } from "@qdrant/js-client-rest";
import { zValidator } from "@hono/zod-validator";
import z from "zod";
import { GoogleGenAI } from "@google/genai";

type Bindings = {
	GEMINI_API_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();
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
		"/api/quiz",
		zValidator(
			"form",
			z.object({
				theme: z.string(),
			}),
		),
		async (c) => {
			const { theme } = c.req.valid("form");
			// define globally?
			const ai = new GoogleGenAI({
				apiKey: c.env.GEMINI_API_KEY,
			});
			const aiResponse = await ai.models.embedContent({
				model: "gemini-embedding-001",
				contents: theme,
			});
			const embedding = aiResponse.embeddings;
			console.log(embedding);
			return c.text("what is the best linux distro?");
		},
	);

export type AppType = typeof route;

export default app;

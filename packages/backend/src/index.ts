import { Hono } from "hono";
import { cors } from "hono/cors";
import { QdrantClient } from "@qdrant/js-client-rest";
import { zValidator } from "@hono/zod-validator";
import z from "zod";

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
		(c) => {
			return c.json({
				ok: true,
				quiz: "what is the best linux distro?",
			});
		},
	);

export type AppType = typeof route;

export default app;

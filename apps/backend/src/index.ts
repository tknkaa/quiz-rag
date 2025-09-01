import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "http://localhost:5173",
  }),
);

const route = app.get("/", (c) => {
  return c.text("Hello Hono!");
});

export type AppType = typeof route;

export default app;

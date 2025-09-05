import type { AppType } from "@packages/backend/src";
import { hc } from "hono/client";

// default bun port
export const client = hc<AppType>("http://localhost:3000");

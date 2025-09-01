import type { AppType } from "backend/src";
import { hc } from "hono/client";

export const client = hc<AppType>("http://localhost:8787");

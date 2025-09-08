import type { AppType } from "@packages/backend/src";
import { hc } from "hono/client";

export const client = hc<AppType>("http://localhost:8787");

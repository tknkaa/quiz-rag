import { defineConfig } from "drizzle-kit";

// bunx drizzle-kit generate
// 1) To migrate remote Db,
// bunx drizzle-kit migrate
// 2) To migrate local db
// bunx wrangler d1 execute daily_code_learn --local --file=path_to_sql_file
export default defineConfig({
	out: "./drizzle",
	schema: "./src/schema.ts",
	dialect: "sqlite",
	driver: "d1-http",
	dbCredentials: {
		accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
		databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
		token: process.env.CLOUDFLARE_D1_TOKEN!,
	},
});

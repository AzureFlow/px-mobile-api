import { type Config } from "drizzle-kit";
import * as process from "process";
import "dotenv/config";

export default {
	schema: "./src/api/database/schema.ts",
	out: "./drizzle",
	driver: "mysql2",
	dbCredentials: {
		connectionString: process.env["DATABASE_URL"],
	},
	breakpoints: false,
} satisfies Config;

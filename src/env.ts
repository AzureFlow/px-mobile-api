import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import { config } from "dotenv";

config({
	path: `.env${process.env.NODE_ENV ? "." + process.env.NODE_ENV : ""}`,
	override: true,
});

const env = createEnv({
	server: {
		NODE_ENV: z.enum(["development", "production"]).default("development"),
		API_SECRET: z.string().min(32),
		AXIOM_DATASET: z.string().min(1).default("test"),
		AXIOM_TOKEN: z.string().startsWith("xaat-").length(41),
		PORT: z
			.string()
			.default("3000")
			.transform((str) => parseInt(str, 10))
			.pipe(z.number().int().nonnegative().lte(65535)),
		COMPRESS_RESPONSE: z.string().transform((str) => str !== "false" && str !== "0"),
		DATABASE_URL: z.string().url(),
		JWT_AUTH_MINUTES: z
			.string()
			.default("60")
			.transform((s) => parseInt(s, 10))
			.pipe(z.number()),
	},
	runtimeEnv: process.env,
});
export default env;

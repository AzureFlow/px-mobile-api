import { drizzle } from "drizzle-orm/mysql2";
import { createPool } from "mysql2/promise";
import { DefaultLogger, eq, LogWriter, sql } from "drizzle-orm";
import { userMapping, users } from "@src/api/database/schema.js";
import { typeid } from "typeid-js";
import env from "@src/env.js";
import { saltKey } from "@src/api/utils.js";
import { ApiUser } from "@src/api/types.js";
import logger from "@src/api/logger.js";
import { TYPEID_API, TYPEID_USER } from "@src/api/constants.js";
import { QueryError } from "mysql2";
import { ExistingUserException } from "@src/api/errors.js";

class DrizzleWriter implements LogWriter {
	write(message: string) {
		logger.trace(message);
	}
}

const drizzleLogger = new DefaultLogger({ writer: new DrizzleWriter() });

export const poolConnection = createPool({
	uri: env.DATABASE_URL,
	ssl: {
		rejectUnauthorized: false,
	},
	multipleStatements: true,
});
const db = drizzle(poolConnection, {
	logger: drizzleLogger,
});

export async function addUsage(userId: string) {
	return db
		.update(users)
		.set({ remainingQuota: sql`${users.remainingQuota} - 1` })
		.where(eq(users.userId, userId));
}

export async function addUser(discordId: string, initQuota = 0, expiresAt: Date | null = null) {
	const tid = typeid(TYPEID_USER);
	const apiKey = makeKey();
	const hashedApiKey = await saltKey(apiKey);

	try {
		await db.transaction(async (tx) => {
			await tx.insert(users).values({
				userId: tid.toString(),
				remainingQuota: initQuota,
				apiKey: hashedApiKey,
				expiresAt: expiresAt,
			});

			await tx.insert(userMapping).values({
				userId: tid.toString(),
				discordId: discordId,
			});
		});

		const ret: ApiUser = {
			userId: tid.toString(),
			apiKey: apiKey,
			remainingQuota: initQuota,
			expiresAt: expiresAt === null ? null : (expiresAt?.getTime() / 1000) | 0,
		};

		return ret;
	} catch (err) {
		// Duplicate user
		if ("sqlMessage" in (err as Error) && (err as QueryError).code === "ER_DUP_ENTRY") {
			throw new ExistingUserException();
		}

		throw err;
	}
}

export async function getUserById(userId: string) {
	return (await db.select().from(users).where(eq(users.userId, userId)))[0];
}

export async function getUserByDiscordId(discordId: string) {
	return (
		await db
			.select()
			.from(users)
			.leftJoin(userMapping, eq(users.userId, userMapping.userId))
			.where(eq(userMapping.discordId, discordId))
	)[0]?.users;
}

export async function getUserByKey(apiKey: string) {
	const hashedApiKey = await saltKey(apiKey);
	return (await db.select().from(users).where(eq(users.apiKey, hashedApiKey)))[0];
}

export async function updateLastLogin(userId: string) {
	return db
		.update(users)
		.set({
			lastLogin: new Date(),
		})
		.where(eq(users.userId, userId));
}

export async function resetKey(userId: string) {
	const newKey = makeKey();
	const hashedApiKey = await saltKey(newKey);

	await db
		.update(users)
		.set({
			apiKey: hashedApiKey,
		})
		.where(eq(users.userId, userId));

	return newKey;
}

function makeKey() {
	// return randomString(32);
	return typeid(TYPEID_API).toString();
}

export default db;

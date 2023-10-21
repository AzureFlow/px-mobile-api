import { int, mysqlTableCreator, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

const mysqlTable = mysqlTableCreator((name) => `pxm_${name}`);

export const users = mysqlTable(
	"users",
	{
		userId: varchar("user_id", {
			length: 64, // typeid
		})
			.unique()
			.notNull(),
		apiKey: varchar("api_key", {
			length: 64,
			// length: 97, // argon2
		}).notNull(),
		remainingQuota: int("remaining_quota").notNull(),
		createdAt: timestamp("created_at")
			.notNull()
			.default(sql`CURRENT_TIMESTAMP`),
		updatedAt: timestamp("updated_at")
			.onUpdateNow()
			.notNull()
			.default(sql`CURRENT_TIMESTAMP`),
		expiresAt: timestamp("expires_at"),
		lastLogin: timestamp("last_login"),
	},
	(table) => {
		return {
			userIdIdx: uniqueIndex("user_id_idx").on(table.userId),
			apiKeyIdx: uniqueIndex("api_key_idx").on(table.apiKey),
		};
	},
);

export const userMapping = mysqlTable(
	"user_mapping",
	{
		userId: varchar("user_id", {
			length: 64, // typeid
		})
			.unique()
			.notNull(),
		discordId: varchar("discord_id", {
			length: 32,
		})
			.unique()
			.notNull(),
	},
	(table) => {
		return {
			userIdIdx: uniqueIndex("user_id_idx").on(table.userId),
			discordIdIdx: uniqueIndex("discord_id_idx").on(table.discordId),
		};
	},
);

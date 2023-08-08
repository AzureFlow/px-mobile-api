import { Hono } from "hono";
import logger from "@src/api/logger.js";
import { AddUserResponse, addUserSchema, BaseResponse, resetUserSchema, UsageResponse } from "@src/api/types.js";
import { addUser, getUserByDiscordId, getUserById, resetKey } from "@src/api/database/database.js";
import env from "@src/env.js";
import { zValidator } from "@hono/zod-validator";
import { fromZodError } from "zod-validation-error";
import { sha256 } from "@src/utils.js";
import { dateToEpoch } from "@src/api/utils.js";
import { ExistingUserException } from "@src/api/errors.js";

const hashedSecret = await sha256(env.API_SECRET);

const adminRouter = new Hono();
// adminRouter.use("*", async (ctx, next) => {
//     const params = ctx.req.valid("json");
//     if (!isValidSecret(params.secret)) {
//         return ctx.json<BaseResponse>({
//             success: false,
//             message: "Invalid auth",
//         }, 401);
//     }
//
//     await next();
// });

adminRouter.put(
	"addUser",
	zValidator("json", addUserSchema, (result, ctx) => {
		if (!result.success) {
			// https://www.npmjs.com/package/zod-validation-error#arguments
			const errorMessage = fromZodError(result.error).toString();

			return ctx.json<BaseResponse>(
				{
					success: false,
					message: errorMessage,
				},
				400,
			);
		}
	}),
	async (ctx) => {
		const params = ctx.req.valid("json");
		if (!isValidSecret(params.secret)) {
			return ctx.json<BaseResponse>(
				{
					success: false,
					message: "Invalid auth",
				},
				401,
			);
		}

		let expiresAt = null;
		if (params.expiresAt) {
			expiresAt = new Date(params.expiresAt);
		}

		try {
			const user = await addUser(params.discordId, params.requests, expiresAt);
			logger.info(
				{
					userId: user.userId,
				},
				"Added user!",
			);

			return ctx.json<AddUserResponse>({
				success: true,
				user: user,
			});
		} catch (err) {
			if (err instanceof ExistingUserException) {
				return ctx.json<BaseResponse>(
					{
						success: false,
						message: err.message,
					},
					400,
				);
			}

			throw err;
		}
	},
);

adminRouter.put(
	"resetKey",
	zValidator("json", resetUserSchema, (result, ctx) => {
		if (!result.success) {
			// https://www.npmjs.com/package/zod-validation-error#arguments
			const errorMessage = fromZodError(result.error).toString();

			return ctx.json<BaseResponse>(
				{
					success: false,
					message: errorMessage,
				},
				400,
			);
		}
	}),
	async (ctx) => {
		const params = ctx.req.valid("json");
		if (!isValidSecret(params.secret)) {
			return ctx.json<BaseResponse>(
				{
					success: false,
					message: "Invalid auth",
				},
				401,
			);
		}

		let user;
		if (params.isDiscord) {
			user = await getUserByDiscordId(params.userId);
		} else {
			user = await getUserById(params.userId);
		}

		if (!user) {
			return ctx.json<BaseResponse>(
				{
					success: false,
					message: "Unknown user",
				},
				400,
			);
		}

		const newKey = await resetKey(user.userId);

		logger.info(
			{
				userId: user.userId,
			},
			`Reset ${user.userId}'s API key`,
		);

		const expiresAt = dateToEpoch(user.expiresAt);
		return ctx.json<AddUserResponse>({
			success: true,
			user: {
				userId: user.userId,
				apiKey: newKey,
				remainingQuota: user.remainingQuota,
				expiresAt: expiresAt,
			},
		});
	},
);

adminRouter.post(
	"usage",
	zValidator("json", resetUserSchema, (result, ctx) => {
		if (!result.success) {
			// https://www.npmjs.com/package/zod-validation-error#arguments
			const errorMessage = fromZodError(result.error).toString();

			return ctx.json<BaseResponse>(
				{
					success: false,
					message: errorMessage,
				},
				400,
			);
		}
	}),
	async (ctx) => {
		const params = ctx.req.valid("json");
		if (!isValidSecret(params.secret)) {
			return ctx.json<BaseResponse>(
				{
					success: false,
					message: "Invalid auth",
				},
				401,
			);
		}

		let user;
		if (params.isDiscord) {
			user = await getUserByDiscordId(params.userId);
		} else {
			user = await getUserById(params.userId);
		}

		if (!user) {
			return ctx.json<BaseResponse>(
				{
					success: false,
					message: "Unknown user",
				},
				400,
			);
		}

		const expiresAt = dateToEpoch(user.expiresAt);
		return ctx.json<UsageResponse>({
			success: true,
			user: {
				userId: user.userId,
				remainingQuota: user.remainingQuota,
				expiresAt: expiresAt,
			},
		});
	},
);

function isValidSecret(secret: string | undefined) {
	return secret !== undefined && secret.toUpperCase() === hashedSecret;
}

export default adminRouter;

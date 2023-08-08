import { Hono } from "hono";
import {
	ApiPxSolution,
	AuthPayload,
	AuthResponse,
	authSchema,
	BaseResponse,
	GenerateResponse,
	generateSchema,
	UsageResponse,
} from "@src/api/types.js";
import { zValidator } from "@hono/zod-validator";
import { fromZodError } from "zod-validation-error";
import { APP_DATABASE } from "@src/px/constants.js";
import bakeCookie from "@src/px/cookies.js";
import { ProxyException, SSLPinException } from "@src/http_client/errors.js";
import { addUsage, getUserById, getUserByKey, updateLastLogin } from "@src/api/database/database.js";
import { createAuthJwt, createJwt, dateToEpoch, extractAuthHeader, isValidType, verifyJwt } from "@src/api/utils.js";
import { jwt } from "hono/jwt";
import env from "@src/env.js";
import { LOGIN_RATELIMIT_MINUTES, TYPEID_API, TYPEID_REFERENCE, TYPEID_USER } from "@src/api/constants.js";
import logger from "@src/api/logger.js";
import { typeid } from "typeid-js";
import { GenerationException } from "@src/px/errors.js";

const apiRouter = new Hono();
const authMiddleware = jwt({
	secret: env.API_SECRET,
	alg: "HS256",
});

apiRouter.post(
	"auth",
	zValidator("form", authSchema, (result, ctx) => {
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
		const params = ctx.req.valid("form");

		if (!isValidType(params.apiKey, TYPEID_API)) {
			return ctx.json<BaseResponse>(
				{
					success: false,
					message: "Malformed API key",
				},
				400,
			);
		}

		const user = await getUserByKey(params.apiKey);

		if (!user) {
			return ctx.json<BaseResponse>(
				{
					success: false,
					message: "Invalid API key",
				},
				400,
			);
		}

		if (LOGIN_RATELIMIT_MINUTES > 0 && user.lastLogin !== null) {
			const now = new Date();
			const saved = user.lastLogin;
			saved.setTime(saved.getTime() + LOGIN_RATELIMIT_MINUTES * 60 * 1000);

			if (now.getTime() <= saved.getTime()) {
				return ctx.json<BaseResponse>(
					{
						success: false,
						message: `Ratelimit, try again in ${((user.lastLogin.getTime() - now.getTime()) / 1000) | 0}s`,
					},
					429,
				);
			}
		}

		const jwt = await createAuthJwt(user.userId, env.JWT_AUTH_MINUTES);
		await updateLastLogin(user.userId);

		return ctx.json<AuthResponse>({
			success: true,
			user: {
				userId: user.userId,
				accessToken: jwt.token,
				expiresAt: jwt.expiresAt,
			},
		});
	},
);

apiRouter.get("usage", authMiddleware, async (ctx) => {
	const decoded = extractAuthHeader(ctx.req.headers);
	const userId = (decoded.payload as AuthPayload).sub;

	if (!isValidType(userId, TYPEID_USER)) {
		return ctx.json<BaseResponse>(
			{
				success: false,
				message: "Malformed user ID",
			},
			400,
		);
	}

	const user = await getUserById(userId);
	if (!user) {
		return ctx.json<BaseResponse>(
			{
				success: false,
				message: "Invalid user ID",
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
});

apiRouter.post(
	"generate",
	authMiddleware,
	zValidator("json", generateSchema, (result, ctx) => {
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

		try {
			const decoded = extractAuthHeader(ctx.req.headers);
			const userId = (decoded.payload as AuthPayload).sub;

			if (!isValidType(userId, TYPEID_USER)) {
				return ctx.json<BaseResponse>(
					{
						success: false,
						message: "Malformed user ID",
					},
					400,
				);
			}

			const user = await getUserById(userId);
			if (!user) {
				return ctx.json<BaseResponse>(
					{
						success: false,
						message: "Invalid user ID",
					},
					400,
				);
			}

			if (user.remainingQuota <= 0) {
				return ctx.json<BaseResponse>(
					{
						success: false,
						message: "You have no remaining requests. Please check you plan.",
					},
					400,
				);
			}

			if (params.task.type === "PxMobileProxy") {
				const app = APP_DATABASE[params.task.site];
				const result = (await bakeCookie(app, params.task.proxy)) as ApiPxSolution;
				result.captchaToken = await createJwt({
					sid: result.sid,
					vid: result.vid,
				});

				const body: GenerateResponse = {
					success: true,
					solution: result,
				};

				// noinspection ES6MissingAwait
				addUsage(userId);

				return ctx.json(body);
			} else if (params.task.type === "PxCaptcha") {
				const payload = (await verifyJwt(params.task.captchaToken)) as {
					sid?: string;
					vid?: string;
				};

				if (payload === null) {
					return ctx.json<BaseResponse>(
						{
							success: false,
							message: "Unauthorized",
						},
						401,
					);
				}

				if (payload.sid !== params.task.sid || payload.vid !== params.task.vid) {
					return ctx.json<BaseResponse>(
						{
							success: false,
							message: "Invalid parameters",
						},
						400,
					);
				}

				console.log("payload:", payload);

				return ctx.json<BaseResponse>(
					{
						success: false,
						message: "Unimplemented",
					},
					400,
				);
			}
		} catch (err) {
			if (err instanceof SSLPinException) {
				const errId = typeid(TYPEID_REFERENCE);
				logger.warn({
					message: "Detected possible MITM attack! Proxy: " + err.message,
					env: env.NODE_ENV,
					ref: errId,
				});
			}

			if (err instanceof GenerationException) {
				return ctx.json<BaseResponse>(
					{
						success: false,
						message: `An error occurred: ${err.message}`,
					},
					500,
				);
			}

			if (err instanceof ProxyException) {
				return ctx.json<BaseResponse>(
					{
						success: false,
						message: `An error occurred while connecting to your proxy: "${err.message}". Please check your proxy and try again.`,
					},
					500,
				);
			}

			throw err;
		}
	},
);

export default apiRouter;

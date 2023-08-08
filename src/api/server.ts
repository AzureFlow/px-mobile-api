import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { logger as honoLogger } from "hono/logger";
import { compress } from "hono/compress";
import { HTTPException } from "hono/http-exception";
import { BaseResponse } from "@src/api/types.js";
import { typeid } from "typeid-js";
import env from "@src/env.js";
import logger from "@src/api/logger.js";
import adminRouter from "@src/api/routes/admin.js";
import apiRouter from "@src/api/routes/api.js";
import { TYPEID_REFERENCE } from "@src/api/constants.js";

const app = new Hono({
	strict: false,
});

app.route("/admin", adminRouter);
app.route("/api", apiRouter);

app.notFound((ctx) => {
	return ctx.json<BaseResponse>(
		{
			success: false,
			message: "Not Found",
		},
		404,
	);
});

app.onError(async (err, ctx) => {
	if (err instanceof HTTPException) {
		const message = await err.getResponse().text();
		return ctx.json<BaseResponse>(
			{
				success: false,
				message: message,
			},
			err.status,
		);
	}

	const headers: string[] = [];
	ctx.req.headers.forEach((value, key) => {
		if (key.includes("authorization")) {
			value = value.substring(0, 25) + "[...]";
		}

		headers.push(`${key}: ${value}`);
	});

	// Hono doesn't provide a way to get the incoming IP
	let ip = "unknown";
	if (ctx.req.headers.get("cf-connecting-ip") !== null) {
		ip = ctx.req.headers.get("cf-connecting-ip") ?? "unknown";
	} else if (ctx.req.headers.get("x-forwarded-for") !== null) {
		ip = ctx.req.headers.get("x-forwarded-for") ?? "unknown";
	}

	const errId = typeid(TYPEID_REFERENCE);
	logger.error({
		stacktrace: err.stack,
		request: {
			ip: ip,
			method: ctx.req.method,
			url: ctx.req.url,
			headers,
			body: await ctx.req.text(),
		},
		env: env.NODE_ENV,
		ref: errId,
	});

	return ctx.json<BaseResponse>(
		{
			success: false,
			message: `An internal server error has occurred. This problem has been logged and support has been notified. Ref#: ${errId}`,
		},
		500,
	);
});

if (env.COMPRESS_RESPONSE) {
	app.use("*", compress());
}

// Print incoming requests to the console
app.use(
	"*",
	honoLogger((msg) => {
		logger.trace(msg);
	}),
);

// Middleware order matters, always do this first
app.use("*", async (ctx, next) => {
	const start = Date.now();
	await next();
	const ms = Date.now() - start;
	ctx.header("X-Response-Time", `${ms}ms`);
	ctx.header("X-Notice", `By using this API you agree to be bound by its TOS`);
});

app.get("/", (ctx) => {
	return ctx.json<BaseResponse>(
		{
			success: true,
			message: "https://tenor.com/view/hello-there-general-kenobi-star-wars-grevious-gif-17774326",
		},
		418,
	);
});

serve(
	{
		fetch: app.fetch,
		port: env.PORT,
		hostname: "0.0.0.0",
	},
	(info) => {
		logger.trace(`Listening on http://localhost:${info.port}`);
	},
);

export default app;

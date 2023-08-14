import { PxSolution } from "@src/px/cookies.js";
import { z } from "zod";

export interface BaseResponse {
	success: boolean;
	// errorMessage?: ErrorMessage;
	message?: string;
}

export interface AuthResponse extends BaseResponse {
	user: AuthUser;
}

export interface AddUserResponse extends BaseResponse {
	user: ApiUser;
}

export interface GenerateResponse extends BaseResponse {
	solution?: ApiPxSolution;
}

export interface ApiPxSolution extends PxSolution {
	captchaToken: string;
}

export interface UsageResponse extends BaseResponse {
	user: ApiUser;
}

export interface AuthPayload {
	iat: number;
	exp: number;
	sub: string;
}

export interface ApiUser {
	userId: string;
	apiKey?: string;
	remainingQuota?: number;
	expiresAt: number | null;
}

export interface AuthUser {
	userId: string;
	accessToken: string;
	expiresAt: number | null;
}

const ApiTask = z.object({
	type: z.string(),
});

const PXMobileTask = ApiTask.extend({
	type: z.literal("PxMobileProxy"),
	proxy: z.string().url(),
	site: z.enum(["walmart", "hibbett", "snipes_usa", "snipes_eu", "shiekh"]),
});

const PXCaptcha = ApiTask.extend({
	type: z.literal("PxCaptcha"),
	captchaToken: z.string(),
	sid: z.string().regex(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/, "Invalid UUID"),
	vid: z.string().regex(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/, "Invalid UUID"),
});

// const DDCaptcha = ApiTask.extend({
//     type: z.literal("DataDomeCaptcha"),
// });

// const AkamaiMobileTask = ApiTask.extend({
//     type: z.literal("AkamaiMobileProxy"),
//     testing: z.string(),
// });

export const generateSchema = z.object({
	task: z.union([PXMobileTask, PXCaptcha]),
	ref: z.string().uuid().optional(),
});

export const authSchema = z.object({
	apiKey: z.string(),
});

const adminBaseSchema = z.object({
	secret: z.string(),
});

export const addUserSchema = adminBaseSchema.extend({
	discordId: z.string().min(17, "Malformed Discord ID").max(20, "Malformed Discord ID"),
	requests: z.number().nonnegative(),
	expiresAt: z.string().datetime().optional().nullable(),
});

export const resetUserSchema = adminBaseSchema.extend({
	userId: z.string(),
	isDiscord: z.boolean().optional(),
});

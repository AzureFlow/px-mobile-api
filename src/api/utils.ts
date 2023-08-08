import { Jwt } from "hono/utils/jwt";
import { AlgorithmTypes } from "hono/utils/jwt/types";
import env from "@src/env.js";
import { sha256 } from "@src/utils.js";
import { AuthPayload } from "@src/api/types.js";
import { TypeID } from "typeid-js";

export function extractAuthHeader(headers: Headers) {
	const jwt = headers.get("Authorization")?.toString().replace("Bearer ", "") ?? "";
	return Jwt.decode(jwt);
}

export async function createAuthJwt(userId: string, expireMinutes: number = 43800) {
	const now = new Date();
	const expiresDate = new Date();
	expiresDate.setTime(expiresDate.getTime() + expireMinutes * 60 * 1000);

	const payload: AuthPayload = {
		iat: (now.getTime() / 1000) | 0,
		exp: (expiresDate.getTime() / 1000) | 0,
		sub: userId,
	};

	return {
		token: await createJwt(payload),
		expiresAt: payload.exp,
	};
}

export async function createJwt(payload: object) {
	return Jwt.sign(payload, env.API_SECRET, AlgorithmTypes.HS256);
}

export async function verifyJwt(jwt: string) {
	try {
		return await Jwt.verify(jwt, env.API_SECRET, AlgorithmTypes.HS256);
	} catch (e) {
		return null;
	}
}

export async function saltKey(apiKey: string) {
	return sha256(apiKey + env.API_SECRET);
}

export function dateToEpoch(date: Date | null) {
	return date === null ? null : (date.getTime() / 1000) | 0;
}

export function isValidType(id: string, typeId: string) {
	try {
		const testType = TypeID.fromString(id);
		return testType.getType() === typeId;
	} catch (e) {
		return false;
	}
}

import crypto from "crypto";

export async function sha1(message: string) {
	return hash(message, "SHA-1");
}

export async function sha256(message: string) {
	return hash(message, "SHA-256");
}

export async function hash(message: string, algorithm: "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512") {
	const data = new TextEncoder().encode(message);
	const hash = await crypto.subtle.digest(algorithm, data);

	return toHex(new Uint8Array(hash));
}

export function toHex(data: Uint8Array) {
	return Array.from(data)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("")
		.toUpperCase();
}

export function randomString(length: number = 16) {
	const output = new Uint8Array(length / 2);
	crypto.getRandomValues(output);

	return toHex(output);
}

export function randomInt(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1) + min);
}

export function randomFloat(min: number, max: number) {
	return Math.random() * (max - min + 1) + min;
}

export function randomItem<T>(items: T[]): T {
	return items[Math.floor(Math.random() * items.length)];
}

export function sleep(seconds: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

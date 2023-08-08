/* eslint-disable @typescript-eslint/ban-ts-comment */

import crypto from "crypto";
import Long from "long";

// TODO: Allow reset
let f317a = Long.MIN_VALUE;

export function generatePXUUID() {
	const ts = Date.now() + 1;
	return toUuidString(BigInt(generateMostSigBits(ts)), BigInt(generateLeastSigBits()));
}

export function generateNewPXUUID() {
	// TODO: Use Date.now() + (idsCreated++)
	const ts = Date.now();
	return toUuidString(BigInt(ts), BigInt(1));
}

function generateMostSigBits(ts: number) {
	const j = generate(
		Long.fromNumber(ts)
			.multiply(10000)
			// .add(Long.fromString("122192928000000000")); // TODO
			.add(Long.fromNumber(122192928000000000)),
	);

	const a = j.and(Long.fromNumber(-281474976710656)).shiftRightUnsigned(48);
	const b = j.shiftLeft(32);
	const c = Long.fromNumber(281470681743360).and(j).shiftRightUnsigned(16);
	return a.or(b).or(4096).or(c).toString();
}

function generate(mixedTs: Long) {
	if (mixedTs > f317a) {
		f317a = mixedTs;
		return mixedTs;
	}

	// const j2 = j + 1;
	// Add +1 for each uuid created this session
	f317a = f317a.add(1);
	return f317a;
}

function generateLeastSigBits() {
	const b = Array.from(crypto.randomBytes(4));
	// const b = [-121, 42, 60, -115]; // TESTING

	const j2 = Long.MIN_VALUE.or(Long.fromNumber(b[0] << 24).and(Long.fromNumber(4278190080)));
	const j3 = j2.or((b[1] << 16) & 16711680);
	const j4 = j3.or((b[2] << 8) & 65280);
	// const j = j4.or(b[3] & -1); // newer
	const j = j4.or(b[3] & 255);

	return j.or(Long.fromNumber(Math.random() * 16383.0).shiftLeft(48)).toString();
	// return j.or(Long.fromNumber(0.3815323891000282 * 16383.0).shiftLeft(48)).toString(); // TESTING
}

// TODO: Move to here
export function toUuidString(msb: bigint, lsb: bigint) {
	// @ts-ignore
	return `${digits(msb >> 32n, 8n)}-${digits(msb >> 16n, 4n)}-${digits(msb, 4n)}-${digits(lsb >> 48n, 4n)}-${digits(
		lsb,
		12n,
	)}`;
}

function digits(value: bigint, ds: bigint) {
	// @ts-ignore
	const hi = 1n << (ds * 4n);

	// @ts-ignore
	return (hi | (value & (hi - 1n))).toString(16).slice(1);
}

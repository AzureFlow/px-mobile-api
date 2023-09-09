import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { Library, LibraryObject } from "ffi-napi";
import {
	TLSClientFetchCookiesForSessionRequestPayload,
	TLSClientFetchCookiesForSessionResponse,
	TLSClientInstance,
	TLSClientReleaseSessionPayload,
	TLSClientReleaseSessionResponse,
	TLSClientRequestPayload,
	TLSClientResponseData,
} from "./types.js";
import { execSync } from "child_process";
import createDebugMessages from "debug";
import { existsSync } from "fs";

const debug = createDebugMessages("tls-client:client");
const __dirname = dirname(fileURLToPath(import.meta.url));

export default class TLSClient implements TLSClientInstance {
	private wrapper: LibraryObject<never> | null;

	constructor(libVersion: string = "1.5.0") {
		this.wrapper = createWrapper(libVersion);
	}

	request(payload: TLSClientRequestPayload): TLSClientResponseData {
		const resp = this.wrapper.request(JSON.stringify(payload));
		return JSON.parse(resp) as TLSClientResponseData;
	}

	async requestAsync(payload: TLSClientRequestPayload): Promise<TLSClientResponseData> {
		return new Promise((resolve) => {
			this.wrapper.request.async(JSON.stringify(payload), (error: Error, response: string) => {
				const clientResponse: TLSClientResponseData = JSON.parse(response);

				resolve(clientResponse);
			});
		});
	}

	destroySession(sessionId: string): TLSClientReleaseSessionResponse {
		const payload: TLSClientReleaseSessionPayload = {
			sessionId,
		};
		const resp = this.wrapper.destroySession(JSON.stringify(payload));
		return JSON.parse(resp) as TLSClientReleaseSessionResponse;
	}

	async destroySessionAsync(sessionId: string): Promise<TLSClientReleaseSessionResponse> {
		const payload: TLSClientReleaseSessionPayload = {
			sessionId,
		};
		return new Promise((resolve) => {
			this.wrapper.destroySession.async(JSON.stringify(payload), (error: Error, response: string) => {
				const clientResponse: TLSClientReleaseSessionResponse = JSON.parse(response);

				resolve(clientResponse);
			});
		});
	}

	getCookiesFromSession(payload: TLSClientFetchCookiesForSessionRequestPayload): TLSClientFetchCookiesForSessionResponse {
		const resp = this.wrapper.getCookiesFromSession(JSON.stringify(payload));
		return JSON.parse(resp) as TLSClientFetchCookiesForSessionResponse;
	}

	async getCookiesFromSessionAsync(
		payload: TLSClientFetchCookiesForSessionRequestPayload,
	): Promise<TLSClientFetchCookiesForSessionResponse> {
		return new Promise((resolve) => {
			this.wrapper.getCookiesFromSession.async(JSON.stringify(payload), (error: Error, response: string) => {
				const clientResponse: TLSClientFetchCookiesForSessionResponse = JSON.parse(response);

				resolve(clientResponse);
			});
		});
	}
}

const createWrapper = (libVersion: string): LibraryObject<never> => {
	let sharedLibraryFilename;
	if (process.platform === "darwin") {
		// macOS
		sharedLibraryFilename = `tls-client-darwin-${process.arch === "x64" ? "amd64" : "arm64"}-${libVersion}.dylib`;
	} else if (process.platform === "win32") {
		sharedLibraryFilename = `tls-client-windows-${process.arch.replace("x", "")}-${libVersion}.dll`;
	} else if (process.platform === "linux") {
		const osRelease = execSync("cat /etc/*release*").toString();

		// Check if Ubuntu or Alpine
		let prefix = "";
		if (process.arch !== "arm64") {
			if (osRelease.includes("ID=ubuntu") || osRelease.includes("ID=debian")) {
				prefix = "ubuntu-";
			} else if (osRelease.includes("ID=alpine")) {
				prefix = "alpine-";
			} else {
				throw new Error(`Invalid OS Release: ${osRelease}`);
			}
		}

		sharedLibraryFilename = `tls-client-linux-${prefix}${process.arch === "x64" ? "amd64" : "arm64"}-${libVersion}.so`;
	} else {
		throw new Error("Invalid platform!");
	}

	const libFile = join(__dirname, "../../lib", sharedLibraryFilename);
	debug(`Loading shared library: "${libFile}"`);
	if (!existsSync(libFile)) {
		throw new Error("Shared library not found!");
	}

	return Library(libFile, {
		request: ["string", ["string"]],
		getCookiesFromSession: ["string", ["string"]],
		addCookiesToSession: ["string", ["string"]],
		freeMemory: ["void", ["string"]],
		destroyAll: ["string", []],
		destroySession: ["string", ["string"]],
	});
};

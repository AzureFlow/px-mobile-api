import TLSClient from "@src/http_client/TLSClient.js";
import { FetchInit, TLSClientRequestPayload } from "@src/http_client/types.js";
import { randomUUID } from "crypto";
import createDebugMessages from "debug";
import { ProxyException, SSLPinException, TimeoutException, TLSClientException } from "@src/http_client/errors.js";
import { randomItem } from "@src/utils.js";

const debug = createDebugMessages("tls-client:fetch");
const tlsClient = new TLSClient();

export default async function fetch(url: string, init?: FetchInit): Promise<Response> {
	const sessionId = randomUUID();
	const payload: TLSClientRequestPayload = {
		requestUrl: url,
		requestMethod: init?.method || "GET",
		requestBody: init?.body || "",
		headers: init?.headers,
		headerOrder: ["accept", "user-agent", "accept-encoding", "accept-language"],
		proxyUrl: init?.proxy || "",
		certificatePinningHosts: {
			"*.perimeterx.net": ["V5L96iSCz0XLFgvKi7YVo6M4SIkOP9zSkDjZ0EoU6b8="],
		},

		// https://github.com/bogdanfinn/tls-client/blob/c35e858e739d5e5d9f17b513c3665c6c064a7b2a/profiles.go#L36
		tlsClientIdentifier: randomItem([
			"okhttp4_android_7",
			"okhttp4_android_8",
			"okhttp4_android_9",
			"okhttp4_android_10",
			"okhttp4_android_11",
			"okhttp4_android_12",
			"okhttp4_android_13",
			// "okhttp4_android_11",
			// "mesh_android",
			// "confirmed_android",
		]),

		// TODO: Custom tls
		// customTlsClient: {
		//     // https://github.com/bogdanfinn/tls-client/blob/master/cffi_dist/example_node/index_custom_client.js
		//     supportedVersions: ["1.3", "1.2"],
		//     supportedSignatureAlgorithms: [
		//         "ECDSAWithP256AndSHA256"
		//     ],
		//     keyShareCurves: [
		//         "X25519",
		//         "P256",
		//         "P384",
		//     ],
		// },
		insecureSkipVerify: false,
		followRedirects: true,
		sessionId: sessionId,
		timeoutSeconds: 20,
		withoutCookieJar: true,
	};
	debug("request: %O", payload);

	const resp = await tlsClient.requestAsync(payload);
	debug("response: %O", resp);

	// Free request
	tlsClient.freeMemory(resp.id);
	tlsClient.destroySession(sessionId);

	// Return result
	if (resp.status === 0) {
		if (resp.body.includes("No connection could be made because the target machine actively refused it.")) {
			throw new ProxyException("Couldn't connect to proxy");
		} else if (resp.body.includes("failed to build client out of request input")) {
			throw new ProxyException("Malformed proxy");
		} else if (resp.body.includes("Proxy responded with non 200 code")) {
			throw new ProxyException("Invalid proxy credentials: " + resp.body);
		} else if (resp.body.includes("context deadline exceeded (Client.Timeout exceeded while awaiting headers)")) {
			throw new TimeoutException();
		} else if (resp.body.includes("bad ssl pin detected")) {
			throw new SSLPinException(init?.proxy || "");
		} else {
			throw new TLSClientException(resp.body);
		}
	}

	const headers: [string, string][] = [];
	if (resp.headers) {
		for (const [header, value] of Object.entries(resp.headers)) {
			for (const h of value) {
				headers.push([header, h]);
			}
		}
	}

	return new Response(resp.body, {
		headers: headers,
		status: resp.status,
	});
}

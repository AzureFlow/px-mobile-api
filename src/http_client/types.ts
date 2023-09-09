type TLSClientIdentifier =
	| "chrome_103"
	| "chrome_104"
	| "chrome_105"
	| "chrome_106"
	| "chrome_107"
	| "chrome_108"
	| "chrome_109"
	| "chrome_110"
	| "chrome_111"
	| "chrome_112"
	| "safari_15_6_1"
	| "safari_16_0"
	| "safari_ipad_15_6"
	| "safari_ios_15_5"
	| "safari_ios_15_6"
	| "safari_ios_16_0"
	| "firefox_102"
	| "firefox_104"
	| "firefox_105"
	| "firefox_106"
	| "firefox_108"
	| "firefox_110"
	| "opera_89"
	| "opera_90"
	| "opera_91"
	| "zalando_android_mobile"
	| "zalando_ios_mobile"
	| "nike_ios_mobile"
	| "nike_android_mobile"
	| "cloudscraper"
	| "mms_ios"
	| "mesh_ios"
	| "mesh_ios_1"
	| "mesh_ios_2"
	| "mesh_android"
	| "mesh_android_1"
	| "mesh_android_2"
	| "confirmed_ios"
	| "confirmed_android"
	| "okhttp4_android_7"
	| "okhttp4_android_8"
	| "okhttp4_android_9"
	| "okhttp4_android_10"
	| "okhttp4_android_11"
	| "okhttp4_android_12"
	| "okhttp4_android_13";
type TLSClientRequestMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export interface TLSClientInstance {
	request: (payload: TLSClientRequestPayload) => TLSClientResponseData;
	requestAsync: (payload: TLSClientRequestPayload) => Promise<TLSClientResponseData>;
	getCookiesFromSession: (payload: TLSClientFetchCookiesForSessionRequestPayload) => TLSClientFetchCookiesForSessionResponse;
	getCookiesFromSessionAsync: (
		payload: TLSClientFetchCookiesForSessionRequestPayload,
	) => Promise<TLSClientFetchCookiesForSessionResponse>;
	destroySession: (sessionId: string) => TLSClientReleaseSessionResponse;
	destroySessionAsync: (sessionId: string) => Promise<TLSClientReleaseSessionResponse>;
}

export interface TLSClientRequestPayload {
	catchPanics?: boolean;
	// WithCertificatePinning enables SSL Pinning for the client and will throw an error if the SSL Pin is not matched.
	// Please refer to https://github.com/tam7t/hpkp/#examples in order to see how to generate pins. The certificatePins are a map with the host as key.
	certificatePinningHosts?: { [key: string]: string[] };
	customTlsClient?: TLSCustomClient;
	followRedirects?: boolean;
	forceHttp1?: boolean;
	headerOrder?: string[];
	headers?: { [key: string]: string };
	insecureSkipVerify?: boolean;
	isByteRequest?: boolean;
	isByteResponse?: boolean;
	isRotatingProxy?: boolean;
	disableIPV6?: boolean;
	localAddress?: string;
	proxyUrl?: string;
	requestBody: string;
	requestCookies?: { [key: string]: string }[];
	requestMethod: TLSClientRequestMethod;
	requestUrl: string;
	sessionId?: string;
	streamOutputBlockSize?: number;
	streamOutputEOFSymbol?: string;
	streamOutputPath?: string;
	timeoutMilliseconds?: number;
	timeoutSeconds?: number;
	tlsClientIdentifier?: TLSClientIdentifier;
	withDebug?: boolean;
	withDefaultCookieJar?: boolean;
	withoutCookieJar?: boolean;
	withRandomTLSExtensionOrder?: boolean;
}

// https://github.com/bogdanfinn/tls-client/blob/master/mapper.go
// https://github.com/bogdanfinn/tls-client/blob/master/custom_profiles.go
// https://github.com/bogdanfinn/tls-client/blob/c35e858e739d5e5d9f17b513c3665c6c064a7b2a/cffi_src/types.go#L82
// https://bogdanfinn.gitbook.io/open-source-oasis/shared-library/payload
export interface TLSCustomClient {
	certCompressionAlgo?: CertCompressionAlgo;
	connectionFlow?: number;
	h2Settings: TLSH2Settings;
	h2SettingsOrder?: TLSHTTPSettingID[];
	headerPriority?: TLSPriorityParam;
	ja3String?: string;
	keyShareCurves?: CurveID[];
	priorityFrames?: TLSPriorityFrames[];
	pseudoHeaderOrder?: string[];
	supportedDelegatedCredentialsAlgorithms?: SignatureScheme[];
	supportedSignatureAlgorithms?: SignatureScheme[];
	supportedVersions?: TLSVersions[];
}

export interface TLSH2Settings {
	HEADER_TABLE_SIZE: number;
	ENABLE_PUSH: number;
	MAX_CONCURRENT_STREAMS: number;
	INITIAL_WINDOW_SIZE: number;
	MAX_FRAME_SIZE: number;
	MAX_HEADER_LIST_SIZE: number;
}

export type TLSHTTPSettingID = keyof TLSH2Settings;

export type TLSVersions = "GREASE" | "1.3" | "1.2" | "1.1" | "1.0";

export type SignatureScheme =
	| "PKCS1WithSHA256"
	| "PKCS1WithSHA384"
	| "PKCS1WithSHA512"
	| "PSSWithSHA256"
	| "PSSWithSHA384"
	| "PSSWithSHA512"
	| "ECDSAWithP256AndSHA256"
	| "ECDSAWithP384AndSHA384"
	| "ECDSAWithP521AndSHA512"
	| "PKCS1WithSHA1"
	| "ECDSAWithSHA1"
	| "Ed25519";

export type CurveID = "GREASE" | "P256" | "P384" | "P521" | "X25519";

export type CertCompressionAlgo = "zlib" | "brotli" | "zstd";

export interface TLSPriorityFrames {
	priorityParam: TLSPriorityParam;
	streamID: number;
}

export interface TLSPriorityParam {
	exclusive: boolean;
	streamDep: number;
	weight: number;
}

export interface TLSClientResponseData {
	sessionId?: string;
	status: number;
	target: string;
	body: string;
	headers: { [key: string]: string[] } | null;
	cookies: { [key: string]: string } | null;
}

export interface TLSClientReleaseSessionPayload {
	sessionId: string;
}

export type TLSClientReleaseSessionResponse = {
	success: boolean;
};

export interface TLSClientFetchCookiesForSessionRequestPayload {
	sessionId: string;
	url: string;
}

export type TLSClientFetchCookiesForSessionResponse = Cookie[];

export interface Cookie {
	Name: string;
	Value: string;
	Path: string;
	Domain: string;
	Expires: string;
	RawExpires: string;
	MaxAge: number;
	Secure: boolean;
	HttpOnly: boolean;
	SameSite: number;
	Raw: string;
	Unparsed: string;
}

export interface FetchInit {
	body?: string;
	headers?: { [key: string]: string };
	method?: TLSClientRequestMethod;
	proxy?: string;
}

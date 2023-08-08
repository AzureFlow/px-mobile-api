export class TLSClientException extends Error {
	name = "TLSClientException";
}

export class TimeoutException extends TLSClientException {
	message = "Connection timeout";
	name = "TimeoutException";
}

export class ProxyException extends TLSClientException {
	name = "ProxyException";
}

export class SSLPinException extends TLSClientException {
	name = "SSLPinException";
}

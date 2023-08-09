import { parse as parseSemVer, SemVer } from "semver";

export const DoEnum = {
	CHALLENGE: "appc",
	SID: "sid",
	VID: "vid",
	BAKE: "bake",
} as const;

export const PxCookieNames = {
	_px: 1,
	_px2: 2,
	_px3: 3,
} as const;

export const SDK_VERSIONS = {
	"1.15.0": parseSemVer("1.15.0")!,
	"1.15.2": parseSemVer("1.15.2")!,
	"1.13.1": parseSemVer("1.13.1")!,
	"2.2.0": parseSemVer("2.2.0")!,
	"2.2.2": parseSemVer("2.2.2")!,
	"2.2.1": parseSemVer("2.2.1")!,
	"3.0.0": parseSemVer("3.0.0")!,
	"3.0.5": parseSemVer("3.0.5")!,
} as const;

export const APP_DATABASE = {
	hibbett: {
		sdkNumber: SDK_VERSIONS["1.15.2"],
		appName: "Hibbett | City Gear",
		appVersion: "6.4.1",
		bundleID: "com.hibbett.android",
		userAgent: "Hibbett Sports/6.4.1 (redroid11_arm64; android 11)", // TODO: replacements
		appId: "PX9Qx3Rve4",
	},
	snipes_usa: {
		sdkNumber: SDK_VERSIONS["1.13.1"],
		appName: "Snipes",
		appVersion: "21.0.4.7-10-g4959b67",
		bundleID: "com.shopgate.android.app22760",
		userAgent: "Snipes/21.0.4 Android/{VERSION_CODES}",
		appId: "PX6XNN2xkk",
	},
	snipes_eu: {
		sdkNumber: SDK_VERSIONS["2.2.2"],
		appName: "SNIPES",
		appVersion: "2.2.3",
		bundleID: "com.snipes",
		userAgent: "SnipesApp/2.2.3 (android; unknown)",
		appId: "PXszbF5p84",
	},
	bed_bath: {
		sdkNumber: SDK_VERSIONS["2.2.1"],
		appName: "My B&BW",
		appVersion: "5.4.1.29",
		bundleID: "com.bathandbody.bbw",
		userAgent: "TODO",
		appId: "PXlsXlyYa5",
	},
	walmart: {
		sdkNumber: SDK_VERSIONS["2.2.2"],
		appName: "Walmart",
		appVersion: "23.19",
		bundleID: "com.walmart.android",
		appId: "PXUArm9B04",
		userAgent: "WMT1H/23.19 Android/{BUILD_VERSION}",
		batteryString: "li.a@9b3a65c",
	},
	chegg: {
		sdkNumber: SDK_VERSIONS["1.15.0"],
		appName: "Chegg Study",
		appVersion: "13.31.1",
		bundleID: "com.chegg",
		appId: "PXaOtQIWNf",
		userAgent: "Chegg Study/13.31.1 (Linux; U; Android 11; redroid11_arm64 Build/RD2A.211001.002)",
		extraData: ["Android", "Chegg Study", "13.31.1"],
	},
	shiekh: {
		sdkNumber: SDK_VERSIONS["3.0.5"],
		appName: "Shiekh",
		appVersion: "10.16",
		bundleID: "com.shiekh.android",
		appId: "PXM2JHbdkv",
		userAgent: "okhttp/4.10.0",
	},
	textfree: {
		sdkNumber: SDK_VERSIONS["2.2.0"],
		appName: "TextNow",
		appVersion: "23.27.1.0",
		bundleID: "com.enflick.android.TextNow",
		appId: "PXK56WkC4O",
		// userAgent: "TextNow 23.27.1.0 (redroid11_arm64; Android OS 11; en_US); TextNow-API 3.133",
		userAgent: "TextNow/23.27.1 (iPhone12,1; iOS 15.2; Scale/2.00)",
		batteryString: "ji.b@a421ef6",
	},
} as const satisfies { [key: string]: PxApp };

export const NETWORK_TYPES = ["3G", "4G"];
export const NETWORK_CARRIERS = [
	"T-Mobile",
	"Vodafone",
	"Msg2Send",
	"Mobitel",
	"Cequens",
	"Vodacom",
	"MTN",
	"Meteor",
	"Movistar",
	"Swisscom",
	"Orange",
	"Unite",
	"Oxygen8",
	"Txtlocal",
	"TextOver",
	"Virgin-Mobile",
	"Aircel",
	"AT&T",
	"Cellcom",
	"BellSouth",
	"Cleartalk",
	"Cricket",
	"DTC",
	"nTelos",
	"Esendex",
	"Kajeet",
	"LongLines",
	"MetroPCS",
	"Nextech",
	"SMS4Free",
	"Solavei",
	"Southernlinc",
	"Sprint",
	"Teleflip",
	"Unicel",
	"Viaero",
	"UTBox",
];

export const PX_COLLECTOR_TEMPLATE = "https://collector-{APP_ID}.perimeterx.net/api/v1/collector/mobile";

export interface PxApp {
	appName: string;
	appVersion: string;
	bundleID: string;
	appId: string;
	sdkNumber: SemVer;
	batteryString?: string;
	userAgent: string;

	// https://docs.perimeterx.com/docs/android-sdk-react-native-integration-guide#adding-custom-parameters
	// Max 10
	extraData?: ReadonlyArray<string>;
}

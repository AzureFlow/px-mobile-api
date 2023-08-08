import { generateNewPXUUID, generatePXUUID } from "@src/px/uuid.js";
import { randomFloat, randomInt, randomItem, sha1 } from "@src/utils.js";
import getChallengeResultFromString from "@src/px/appc2.js";
import {
	DoEnum,
	NETWORK_CARRIERS,
	NETWORK_TYPES,
	PX_COLLECTOR_TEMPLATE,
	PxApp,
	PxCookieNames,
	SDK_VERSIONS,
} from "./constants.js";
import { DeviceFingerprint, getRandomDevice } from "@src/px/device.js";
import { randomBytes, randomUUID } from "crypto";
import { writeFile } from "fs/promises";
import { URLSearchParams } from "url";
import fetch from "@src/http_client/fetch_compat.js";
import createDebugMessages from "debug";
import env from "@src/env.js";
import { GenerationException } from "@src/px/errors.js";

const debug = createDebugMessages("px:cookie");
const DEBUG_PAYLOAD = env.NODE_ENV === "development";

export default async function bakeCookie(app: PxApp, proxy: string) {
	const startTime = performance.now();

	const PX_ENDPOINT = PX_COLLECTOR_TEMPLATE.replace("{APP_ID}", app.appId.toLowerCase());
	const USER_AGENT = "PerimeterX Android SDK/" + app.sdkNumber.version;
	const device = await getRandomDevice();
	const payload1 = await getInitPayload(device, app);
	debug("Payload1: %O", payload1[0].d);

	if (DEBUG_PAYLOAD) {
		await writeFile("./research/payloads/payload1.txt", encodePayload(payload1), "utf8");
	}

	// Only use new uuid method on versions newer than 2.2.0
	let uuidReq;
	if (app.sdkNumber.compare(SDK_VERSIONS["2.2.0"]) >= 0) {
		uuidReq = randomUUID();
	} else {
		uuidReq = generatePXUUID();
	}

	const resp = await fetch(PX_ENDPOINT, {
		method: "POST",
		body: new URLSearchParams(
			addExtraData(
				{
					payload: encodePayload(payload1),
					uuid: uuidReq,
					appId: app.appId,
					tag: "mobile",
					ftag: "22",
				},
				app,
			),
		).toString(),
		headers: {
			"user-agent": USER_AGENT,
			// "content-type": "application/x-www-form-urlencoded", // older

			"accept-charset": "UTF-8",
			accept: "*/*",
			"content-type": "application/x-www-form-urlencoded; charset=utf-8",
			"accept-encoding": "gzip",
		},
		proxy: proxy,
	});
	const content = (await resp.json()) as PxResponse;
	debug("DO: %O", content.do);

	// TODO: Check if contains DoEnum.BAKE on first request - means HoldCaptcha

	let sid = "";
	let vid = "";
	for (const item of content.do) {
		const parts = item.split("|");
		const type = parts[0];

		if (type === DoEnum.SID) {
			sid = parts[1];
			// debug("SID: %O", sid);
		} else if (type === DoEnum.VID) {
			vid = parts[1];
			// debug("VID: %O", vid);
		} else if (type === DoEnum.CHALLENGE) {
			const index = parseInt(parts[1]);
			const timestamp = parseInt(parts[2]);

			// eslint-disable-next-line no-empty
			if (index === 1) {
			} else if (index === 2) {
				const signed = parts[3];

				const challengeResult = getChallengeResultFromString(item, device.productModel);
				const payload2 = await getPayload2(app, payload1, signed, challengeResult, timestamp);
				if (DEBUG_PAYLOAD) {
					await writeFile("./research/payloads/payload2.txt", encodePayload(payload2), "utf8");
				}

				// TODO: This is stupid, don't split twice, once above and once in appc

				debug("Parsed: %O", {
					appc2: {
						challengeResult,
						signed,
					},
					sid,
					vid,
				});

				debug("Payload2: %O", payload2[0].d);

				const resp2 = await fetch(PX_ENDPOINT, {
					method: "POST",
					body: new URLSearchParams(
						addExtraData(
							{
								payload: encodePayload(payload2),
								uuid: uuidReq,
								appId: app.appId,
								tag: "mobile",
								ftag: "22",
								sid: sid,
								vid: vid,
							},
							app,
						),
					).toString(),
					headers: {
						"user-agent": USER_AGENT,
						// "content-type": "application/x-www-form-urlencoded", // older

						"accept-charset": "UTF-8",
						accept: "*/*",
						"content-type": "application/x-www-form-urlencoded; charset=utf-8",
						"accept-encoding": "gzip",
					},
					proxy: proxy,
				});
				const content2 = (await resp2.json()) as PxResponse;
				debug("content2 (%d): %O", resp2.status, content2);

				if (content2.do.length > 0 && content2.do[0].includes("bake")) {
					const cookieParts = content2.do[0].split("|");

					if (!(cookieParts[1] in PxCookieNames)) {
						throw new Error("Invalid cookie type");
					}

					// Check for _px2 or _px3
					const cookieVersion = PxCookieNames[cookieParts[1] as keyof typeof PxCookieNames];
					const cookie = cookieVersion + ":" + cookieParts[3];
					debug("PX cookie: %O", cookie);

					// const userAgent = app.userAgent
					//     .replace("{BUILD_VERSION}", "idk")
					//     .replace("VERSION_CODES", "");

					const headers: PxSolutionHeaders = {
						"user-agent": app.userAgent,
						"x-px-authorization": cookie,
					};

					if (app.sdkNumber.compare(SDK_VERSIONS["3.0.0"]) >= 0) {
						headers["x-px-os-version"] = device.buildVersionCode;
						headers["x-px-uuid"] = uuidReq;
						headers["x-px-device-fp"] = payload1[0].d.PX1214 ?? "ERROR";
						headers["x-px-device-model"] = device.productModel; // Build.MODEL
						headers["x-px-os"] = "Android";
						// Huh, version 2 token, but version 3 for hello
						headers["x-px-hello"] = encodePxHello(uuidReq, "3");
						headers["x-px-mobile-sdk-version"] = app.sdkNumber.version;
						// "x-px-authorization": "1",
					}

					const result: PxSolution = {
						site: app.appId,
						solveTime: (performance.now() - startTime) | 0,
						sid,
						vid,

						// Return v3 headers
						headers: headers,
					};

					return result;
				} else {
					throw new GenerationException("Failed! " + JSON.stringify(content2));
				}
			}
		}
	}

	throw new GenerationException("An unknown error occurred while generating a PX cookie. Please try again later.");
}

async function getInitPayload(device: DeviceFingerprint, app: PxApp) {
	const isV2 = app.sdkNumber.compare(SDK_VERSIONS["2.2.0"]) >= 0;
	const timestamp = (Date.now() / 1000) | 0;
	const fingerprints = await createFingerprints(device, isV2);

	// PX414
	// https://developer.android.com/reference/android/os/BatteryManager
	// (0): ""
	// (1): unknown
	// BATTERY_STATUS_CHARGING (2): charging
	// BATTERY_STATUS_DISCHARGING (3): discharging
	// BATTERY_STATUS_NOT_CHARGING (4): not charging
	// BATTERY_STATUS_FULL (5): full

	const data: PxData = {
		// PX350: 1 // manager_ready_time_interval - TODO: on later
		PX91: device.width, // screen.width
		PX92: device.height, // screen.height
		PX316: true, // sim_support
		// PX345: 0, // resume_counter - increased every time app is opened/swap to
		// PX351: 1, // app_active_time_interval
		PX345: randomInt(0, 2), // resume_counter - increased every time app is opened/swap to
		PX351: randomInt(0, 86000), // app_active_time_interval
		PX317: "wifi", // connection_type
		PX318: device.buildVersionSdk, // device_os_version
		PX319: device.buildVersionRelease, // TODO: device_kernel_version
		PX320: device.productModel, // device_model
		PX323: timestamp, // unix_time
		PX326: fingerprints.fingerprint1, // "fd1bf990-f347-11ed-9675-00001d291f30"
		PX327: fingerprints.fingerprint2, // "FD1BF991"
		PX328: fingerprints.fingerprint3, // "09D6DC091783DED4B218A01012C029BDD29E055D"
		PX337: true, // sensor_gps
		PX336: true, // sensor_gyroscope
		PX335: true, // sensor_accelrometer
		PX334: false, // sensor_ethernet
		PX333: true, // sensor_touchscreen
		PX331: true, // sensor_nfc
		PX332: true, // sensor_wifi
		PX330: "new_session", // app_state
		PX421: "false", // is_rooted
		PX442: "false", // is_test_keys
		PX339: device.productManufacturer, // device_type
		PX322: "Android", // device_os_name
		PX340: `v${app.sdkNumber.version}`, // sdk_version
		PX341: app.appName, // app_name
		PX342: app.appVersion, // app_version
		PX348: app.bundleID, // app_identifier
		PX343: randomItem(NETWORK_TYPES), // network
		PX344: randomItem(NETWORK_CARRIERS), // carrier
		PX347: ["en_US"], // device_supported_languages
		PX413: "good", // battery_health
		PX414: "not charging", // battery_status, USB
		PX415: randomInt(25, 95), // battery_level
		PX416: "None", // battery_plugged, (v3: USB)
		PX419: "Li-ion", // battery_technology
		PX418: parseFloat(randomFloat(20, 25).toFixed(2)), // Float.valueOf(battery_temperature)
		PX420: parseFloat(randomFloat(3, 4).toFixed(3)), // Float.valueOf(battery_voltage)
		// PX420: parseFloat(randomItem([4.2, 4.1, 4.0, 3.9, 3.8, 3.7, 3.6, 3.5]).toFixed(3)), // Float.valueOf(battery_voltage)
		// PX418: parseInt(randomFloat(20, 25).toFixed(2)), // battery_temperature
		// PX420: parseInt(randomItem([4.2, 4.1, 4.0, 3.9, 3.8, 3.7, 3.6, 3.5]).toFixed(3)), // battery_voltage
	};

	if (app.sdkNumber.compare(SDK_VERSIONS["1.15.2"]) >= 0) {
		data.PX1159 = false; // is_instant_app - TODO: Not used in older versions
	}

	if (isV2) {
		data.PX1208 = "[]"; // unknown_idk
		data.PX1214 = createAndroidId(); // androidId
		data.PX317 = "WiFi"; // connection_type
		data.PX321 = device.productDevice; // device_name
		data.PX341 = `"${app.appName}"`; // app_name
		data.PX347 = "[en_US]"; // device_supported_languages
		data.PX416 = ""; // battery_plugged
		data.PX419 = app.batteryString ?? "li.a@9b3a65c"; // battery_technology - walmart
	}

	if (app.sdkNumber.compare(SDK_VERSIONS["3.0.0"]) >= 0) {
		data.PX347 = '["en_US"]'; // device_supported_languages
		data.PX419 = ""; // battery_technology
		data.PX21215 = randomInt(10, 255); // screen_brightness (0-255): https://developer.android.com/reference/android/provider/Settings.System#SCREEN_BRIGHTNESS
		// data.PX21217 = "[]"; // TODO: device_motion_datas
		// data.PX21218 = "[]"; // TODO: touch_datas
		data.PX21217 = getMotionData();
		data.PX21218 = getTouchData(device);
		data.PX21219 = "{}"; // additional_data - always empty ("{}")
		data.PX21221 = "true"; // unknown_always_true
	}

	return [
		{
			t: "PX315",
			d: data,
		},
	] as PxPayload[];
}

function getMotionData() {
	// "x,y,z,timestamp"
	// return '["-49,-1,-57,31","-49,-2,-58,31","-50,-2,-58,31","-49,-3,-58,31","-49,-3,-60,31","-49,-4,-60,31","-49,-4,-59,31","-50,-4,-59,31","-50,-4,-61,31","-50,-4,-60,31","-50,-3,-60,31","-50,-3,-59,31","-50,-2,-59,31","-50,-2,-58,31","-50,-2,-59,31","-50,-2,-58,31","-50,-1,-58,31","-50,-1,-59,31","-50,-1,-58,31","-50,0,-58,31","-50,0,-57,31","-50,0,-58,31","-50,0,-57,31","-50,0,-58,31","-50,0,-57,31","-50,0,-58,31","-50,0,-57,31","-50,0,-58,31","-50,-1,-58,31","-50,-2,-58,31","-50,-2,-59,31","-50,-3,-59,31","-50,-3,-60,31","-50,-2,-60,31","-50,-2,-59,31","-49,-2,-59,31","-49,-2,-60,31","-50,-1,-59,31","-50,-1,-58,31","-49,-1,-58,31","-49,-1,-59,31","-49,-1,-58,31","-50,-1,-58,31","-50,-1,-59,31","-50,-1,-58,31","-50,-2,-58,31","-50,-1,-58,31","-50,-1,-59,31","-50,-1,-58,31","-50,-1,-59,31"]';
	return "[]";
}

function getTouchData(device: DeviceFingerprint) {
	const results: string[] = [];
	let timestamp = 200;
	for (let i = 0; i < 10; i++) {
		const x = randomInt(0, device.width);
		const y = randomInt(0, device.height);
		timestamp += randomInt(0, 25);

		// "x,y,timestamp"
		results.push([x, y, timestamp].join(","));
	}

	return JSON.stringify(results);
	// return "[\"560,828,278\",\"560,785,278\",\"699,791,340\",\"430,994,340\",\"443,525,341\",\"403,913,342\",\"417,978,342\",\"359,916,343\",\"233,992,344\",\"341,540,344\"]";
}

async function getPayload2(
	app: PxApp,
	payload1: PxPayload[],
	challengeSigned: string,
	challengeResult: string,
	challengeTs: number,
) {
	const p1 = payload1[0].d;

	const data: PxData = {
		PX349: randomInt(150, 200), // collector_request_rtt x
		PX320: p1.PX320, // device_model
		PX259: challengeTs, // challenge_ts x
		PX256: challengeSigned, // challenge_signed x
		PX257: challengeResult, // challenge_result x
		PX339: p1.PX339, // device_type
		PX322: p1.PX322, // device_os_name
		PX340: p1.PX340, // sdk_version
		PX341: p1.PX341, // app_name
		PX342: p1.PX342, // app_version
		PX348: p1.PX348, // app_identifier
		PX343: p1.PX343, // network
		PX344: p1.PX344, // carrier
		PX347: p1.PX347, // device_supported_languages
		PX413: p1.PX413, // battery_health
		PX414: p1.PX414, // battery_status
		PX415: p1.PX415, // battery_level
		PX416: p1.PX416, // battery_plugged
		PX419: p1.PX419, // battery_technology
		PX418: p1.PX418, // battery_temperature
		PX420: p1.PX420, // battery_voltage
	};

	if (app.sdkNumber.compare(SDK_VERSIONS["1.15.2"]) >= 0) {
		data.PX1159 = false; // is_instant_app
	}

	if (app.sdkNumber.compare(SDK_VERSIONS["2.2.0"]) >= 0) {
		data.PX91 = p1.PX91;
		data.PX92 = p1.PX92;
		data.PX316 = p1.PX316;
		data.PX317 = p1.PX317;
		data.PX318 = p1.PX318;
		data.PX319 = p1.PX319;
		data.PX321 = p1.PX321;
		data.PX323 = p1.PX323;
		data.PX326 = p1.PX326;
		data.PX327 = p1.PX327;
		data.PX328 = p1.PX328;
		data.PX330 = p1.PX330;
		data.PX331 = p1.PX331;
		data.PX332 = p1.PX332;
		data.PX333 = p1.PX333;
		data.PX334 = p1.PX334;
		data.PX335 = p1.PX335;
		data.PX336 = p1.PX336;
		data.PX337 = p1.PX337;
		data.PX345 = p1.PX345;
		data.PX351 = p1.PX351;
		data.PX421 = p1.PX421;
		data.PX442 = p1.PX442;
		data.PX1208 = p1.PX1208;
		data.PX1214 = p1.PX1214;
		delete data.PX349;
	}

	if (app.sdkNumber.compare(SDK_VERSIONS["3.0.0"]) >= 0) {
		data.PX21215 = p1.PX21215;
		data.PX21217 = p1.PX21217;
		data.PX21218 = p1.PX21218;
		data.PX21219 = p1.PX21219;
		data.PX21221 = p1.PX21221;
	}

	return [
		{
			t: "PX329",
			d: data,
		},
	] as PxPayload[];
}

function addExtraData(body: { [key: string]: string }, app: PxApp) {
	if (!app.extraData) {
		return body;
	}

	for (const [index, value] of app.extraData.entries()) {
		// Warning: This mutates the original object
		body[`p${index + 1}`] = value;
	}

	// Alt method
	// const customParams: { [key: string]: string }[] = app.extraData.map((value, index) => ({[`p${index + 1}`]: value}));
	// return Object.assign(body, ...customParams);

	return body;
}

function encodePayload(payload: PxPayload[]) {
	return Buffer.from(JSON.stringify(payload)).toString("base64");
}

function encodePxHello(uuid: string, version: "2" | "3") {
	const a = new TextEncoder().encode(uuid);
	const b = new TextEncoder().encode(version);

	const result = new Uint8Array(a.length);
	for (let i = 0; i < a.length; i++) {
		result[i] = a[i] ^ b[i % b.length];
	}

	return Buffer.from(result).toString("base64");
}

function createAndroidId() {
	return randomBytes(8).toString("hex");
}

async function createFingerprints(device: DeviceFingerprint, newVersion: boolean) {
	let fingerprint1: string;
	let fingerprint2: string;
	let fingerprint3: string;

	if (newVersion) {
		// long j = System.currentTimeMillis();
		// if (currentTimeMillis == C0147f.f431a) {
		//     j++;
		// }
		// String uuid = new UUID(j, 1L).toString();

		fingerprint1 = generateNewPXUUID();
		fingerprint2 = fingerprint1.split("-")[0].toUpperCase();
		fingerprint3 = await sha1(device.productModel + fingerprint1 + fingerprint2);
	} else {
		// PX326: "fd1bf990-f347-11ed-9675-00001d291f30"
		fingerprint1 = generatePXUUID();

		// PX327: "FD1BF991"
		fingerprint2 = generatePXUUID().split("-")[0].toUpperCase();

		// PX328: "09D6DC091783DED4B218A01012C029BDD29E055D"
		fingerprint3 = await sha1(device.productModel + fingerprint1 + fingerprint2);
	}

	return {
		fingerprint1,
		fingerprint2,
		fingerprint3,
	};
}

interface PxPayload {
	t: string;
	d: PxData;
}

interface PxData {
	// [key: string]: any;
	PX1?: string;
	PX2?: string;
	PX3?: string;
	PX4?: string;
	PX6?: string;
	PX7?: string;
	PX8?: string;
	PX9?: string;
	PX10?: string;
	PX11?: string;
	PX12?: string;
	PX13?: string;
	PX14?: string;
	PX15?: string;
	PX16?: string;
	PX17?: string;
	PX18?: string;
	PX19?: string;
	PX20?: string;
	PX21?: string;
	PX22?: string;
	PX23?: string;
	PX24?: string;
	PX25?: string;
	PX26?: string;
	PX27?: string;
	PX28?: string;
	PX29?: string;
	PX30?: string;
	PX31?: string;
	PX32?: string;
	PX33?: string;
	PX34?: string;
	PX35?: string;
	PX36?: string;
	PX38?: string;
	PX39?: string;
	PX40?: string;
	PX41?: string;
	PX42?: string;
	PX43?: string;
	PX44?: string;
	PX45?: string;
	PX46?: string;
	PX47?: string;
	PX48?: string;
	PX49?: string;
	PX50?: string;
	PX51?: string;
	PX52?: string;
	PX53?: string;
	PX54?: string;
	PX55?: string;
	PX56?: string;
	PX57?: string;
	PX58?: string;
	PX59?: string;
	PX60?: string;
	PX61?: string;
	PX62?: string;
	PX63?: string;
	PX64?: string;
	PX65?: string;
	PX66?: string;
	PX67?: string;
	PX68?: string;
	PX69?: string;
	PX70?: string;
	PX71?: string;
	PX72?: string;
	PX73?: string;
	PX74?: string;
	PX75?: string;
	PX76?: string;
	PX77?: string;
	PX78?: string;
	PX79?: string;
	PX80?: string;
	PX81?: string;
	PX82?: string;
	PX83?: string;
	PX84?: string;
	PX85?: string;
	PX86?: string;
	PX87?: string;
	PX88?: string;
	PX89?: string;
	PX90?: string;
	PX91?: number;
	PX92?: number;
	PX93?: string;
	PX94?: string;
	PX95?: string;
	PX96?: string;
	PX97?: string;
	PX98?: string;
	PX99?: string;
	PX100?: string;
	PX101?: string;
	PX102?: string;
	PX103?: string;
	PX104?: string;
	PX105?: string;
	PX106?: string;
	PX107?: string;
	PX108?: string;
	PX109?: string;
	PX110?: string;
	PX111?: string;
	PX112?: string;
	PX113?: string;
	PX114?: string;
	PX115?: string;
	PX116?: string;
	PX117?: string;
	PX118?: string;
	PX119?: string;
	PX120?: string;
	PX121?: string;
	PX122?: string;
	PX123?: string;
	PX124?: string;
	PX125?: string;
	PX126?: string;
	PX127?: string;
	PX128?: string;
	PX129?: string;
	PX130?: string;
	PX131?: string;
	PX133?: string;
	PX134?: string;
	PX135?: string;
	PX136?: string;
	PX137?: string;
	PX138?: string;
	PX139?: string;
	PX140?: string;
	PX141?: string;
	PX142?: string;
	PX143?: string;
	PX144?: string;
	PX145?: string;
	PX146?: string;
	PX147?: string;
	PX148?: string;
	PX149?: string;
	PX150?: string;
	PX151?: string;
	PX152?: string;
	PX153?: string;
	PX154?: string;
	PX155?: string;
	PX156?: string;
	PX157?: string;
	PX158?: string;
	PX159?: string;
	PX160?: string;
	PX161?: string;
	PX162?: string;
	PX163?: string;
	PX164?: string;
	PX165?: string;
	PX166?: string;
	PX167?: string;
	PX168?: string;
	PX169?: string;
	PX170?: string;
	PX171?: string;
	PX172?: string;
	PX173?: string;
	PX174?: string;
	PX175?: string;
	PX176?: string;
	PX177?: string;
	PX178?: string;
	PX179?: string;
	PX180?: string;
	PX181?: string;
	PX182?: string;
	PX183?: string;
	PX184?: string;
	PX185?: string;
	PX186?: string;
	PX187?: string;
	PX188?: string;
	PX189?: string;
	PX190?: string;
	PX191?: string;
	PX192?: string;
	PX193?: string;
	PX194?: string;
	PX195?: string;
	PX196?: string;
	PX197?: string;
	PX198?: string;
	PX199?: string;
	PX200?: string;
	PX201?: string;
	PX202?: string;
	PX203?: string;
	PX204?: string;
	PX205?: string;
	PX206?: string;
	PX207?: string;
	PX208?: string;
	PX209?: string;
	PX210?: string;
	PX211?: string;
	PX212?: string;
	PX213?: string;
	PX214?: string;
	PX215?: string;
	PX216?: string;
	PX217?: string;
	PX218?: string;
	PX219?: string;
	PX220?: string;
	PX221?: string;
	PX222?: string;
	PX223?: string;
	PX224?: string;
	PX225?: string;
	PX226?: string;
	PX227?: string;
	PX228?: string;
	PX229?: string;
	PX230?: string;
	PX231?: string;
	PX232?: string;
	PX233?: string;
	PX234?: string;
	PX235?: string;
	PX236?: string;
	PX237?: string;
	PX238?: string;
	PX239?: string;
	PX240?: string;
	PX241?: string;
	PX242?: string;
	PX243?: string;
	PX244?: string;
	PX245?: string;
	PX246?: string;
	PX247?: string;
	PX248?: string;
	PX249?: string;
	PX250?: string;
	PX251?: string;
	PX252?: string;
	PX253?: string;
	PX254?: string;
	PX255?: string;
	PX256?: string;
	PX257?: string;
	PX258?: string;
	PX259?: number;
	PX260?: string;
	PX261?: string;
	PX262?: string;
	PX263?: string;
	PX264?: string;
	PX265?: string;
	PX266?: string;
	PX267?: string;
	PX268?: string;
	PX269?: string;
	PX270?: string;
	PX271?: string;
	PX272?: string;
	PX273?: string;
	PX274?: string;
	PX275?: string;
	PX276?: string;
	PX277?: string;
	PX278?: string;
	PX279?: string;
	PX280?: string;
	PX281?: string;
	PX282?: string;
	PX283?: string;
	PX284?: string;
	PX285?: string;
	PX286?: string;
	PX287?: string;
	PX288?: string;
	PX289?: string;
	PX290?: string;
	PX291?: string;
	PX292?: string;
	PX293?: string;
	PX294?: string;
	PX295?: string;
	PX296?: string;
	PX297?: string;
	PX298?: string;
	PX299?: string;
	PX300?: string;
	PX301?: string;
	PX302?: string;
	PX303?: string;
	PX304?: string;
	PX305?: string;
	PX306?: string;
	PX307?: string;
	PX308?: string;
	PX309?: string;
	PX310?: string;
	PX311?: string;
	PX312?: string;
	PX313?: string;
	PX314?: string;
	PX315?: string;
	PX316?: boolean;
	PX317?: string;
	PX318?: string;
	PX319?: string;
	PX320?: string;
	PX321?: string;
	PX322?: string;
	PX323?: number;
	PX324?: string;
	PX325?: string;
	PX326?: string;
	PX327?: string;
	PX328?: string;
	PX329?: string;
	PX330?: string;
	PX331?: boolean;
	PX332?: boolean;
	PX333?: boolean;
	PX334?: boolean;
	PX335?: boolean;
	PX336?: boolean;
	PX337?: boolean;
	PX338?: string;
	PX339?: string;
	PX340?: string;
	PX341?: string;
	PX342?: string;
	PX343?: string;
	PX344?: string;
	PX345?: number;
	PX346?: string;
	PX347?: string[] | string;
	PX348?: string;
	PX349?: number;
	PX350?: string;
	PX351?: number;
	PX352?: string;
	PX353?: string;
	PX354?: string;
	PX355?: string;
	PX356?: string;
	PX357?: string;
	PX358?: string;
	PX359?: string;
	PX360?: string;
	PX361?: string;
	PX362?: string;
	PX363?: string;
	PX364?: string;
	PX365?: string;
	PX366?: string;
	PX367?: string;
	PX368?: string;
	PX369?: string;
	PX370?: string;
	PX371?: string;
	PX372?: string;
	PX373?: string;
	PX374?: string;
	PX375?: string;
	PX376?: string;
	PX377?: string;
	PX378?: string;
	PX379?: string;
	PX380?: string;
	PX381?: string;
	PX382?: string;
	PX383?: string;
	PX384?: string;
	PX385?: string;
	PX386?: string;
	PX387?: string;
	PX388?: string;
	PX389?: string;
	PX390?: string;
	PX391?: string;
	PX392?: string;
	PX393?: string;
	PX394?: string;
	PX395?: string;
	PX396?: string;
	PX397?: string;
	PX398?: string;
	PX399?: string;
	PX400?: string;
	PX401?: string;
	PX402?: string;
	PX403?: string;
	PX404?: string;
	PX405?: string;
	PX406?: string;
	PX407?: string;
	PX408?: string;
	PX409?: string;
	PX410?: string;
	PX411?: string;
	PX412?: string;
	PX413?: string;
	PX414?: string;
	PX415?: number;
	PX416?: string;
	PX417?: string;
	PX418?: number;
	PX419?: string;
	PX420?: number;
	PX421?: string;
	PX422?: string;
	PX423?: string;
	PX424?: string;
	PX425?: string;
	PX426?: string;
	PX427?: string;
	PX428?: string;
	PX429?: string;
	PX430?: string;
	PX431?: string;
	PX432?: string;
	PX433?: string;
	PX434?: string;
	PX435?: string;
	PX436?: string;
	PX437?: string;
	PX438?: string;
	PX439?: string;
	PX440?: string;
	PX441?: string;
	PX442?: string;
	PX443?: string;
	PX444?: string;
	PX445?: string;
	PX446?: string;
	PX447?: string;
	PX448?: string;
	PX449?: string;
	PX450?: string;
	PX451?: string;
	PX452?: string;
	PX453?: string;
	PX454?: string;
	PX455?: string;
	PX456?: string;
	PX457?: string;
	PX458?: string;
	PX459?: string;
	PX460?: string;
	PX461?: string;
	PX462?: string;
	PX463?: string;
	PX464?: string;
	PX465?: string;
	PX466?: string;
	PX467?: string;
	PX468?: string;
	PX469?: string;
	PX470?: string;
	PX471?: string;
	PX472?: string;
	PX473?: string;
	PX474?: string;
	PX475?: string;
	PX476?: string;
	PX477?: string;
	PX478?: string;
	PX479?: string;
	PX480?: string;
	PX481?: string;
	PX482?: string;
	PX483?: string;
	PX484?: string;
	PX485?: string;
	PX486?: string;
	PX487?: string;
	PX489?: string;
	PX490?: string;
	PX491?: string;
	PX492?: string;
	PX493?: string;
	PX494?: string;
	PX495?: string;
	PX496?: string;
	PX497?: string;
	PX498?: string;
	PX499?: string;
	PX500?: string;
	PX501?: string;
	PX502?: string;
	PX503?: string;
	PX504?: string;
	PX505?: string;
	PX506?: string;
	PX507?: string;
	PX508?: string;
	PX509?: string;
	PX510?: string;
	PX511?: string;
	PX512?: string;
	PX513?: string;
	PX514?: string;
	PX515?: string;
	PX516?: string;
	PX517?: string;
	PX518?: string;
	PX519?: string;
	PX520?: string;
	PX521?: string;
	PX522?: string;
	PX523?: string;
	PX524?: string;
	PX525?: string;
	PX526?: string;
	PX527?: string;
	PX528?: string;
	PX529?: string;
	PX530?: string;
	PX531?: string;
	PX532?: string;
	PX533?: string;
	PX534?: string;
	PX535?: string;
	PX536?: string;
	PX537?: string;
	PX538?: string;
	PX539?: string;
	PX540?: string;
	PX541?: string;
	PX542?: string;
	PX543?: string;
	PX544?: string;
	PX545?: string;
	PX546?: string;
	PX547?: string;
	PX548?: string;
	PX549?: string;
	PX550?: string;
	PX551?: string;
	PX552?: string;
	PX553?: string;
	PX554?: string;
	PX555?: string;
	PX556?: string;
	PX557?: string;
	PX558?: string;
	PX559?: string;
	PX560?: string;
	PX561?: string;
	PX562?: string;
	PX563?: string;
	PX564?: string;
	PX565?: string;
	PX566?: string;
	PX567?: string;
	PX568?: string;
	PX569?: string;
	PX570?: string;
	PX571?: string;
	PX572?: string;
	PX573?: string;
	PX574?: string;
	PX575?: string;
	PX576?: string;
	PX577?: string;
	PX578?: string;
	PX579?: string;
	PX580?: string;
	PX581?: string;
	PX582?: string;
	PX583?: string;
	PX584?: string;
	PX585?: string;
	PX586?: string;
	PX587?: string;
	PX588?: string;
	PX589?: string;
	PX590?: string;
	PX591?: string;
	PX592?: string;
	PX593?: string;
	PX594?: string;
	PX595?: string;
	PX596?: string;
	PX597?: string;
	PX598?: string;
	PX599?: string;
	PX600?: string;
	PX601?: string;
	PX602?: string;
	PX603?: string;
	PX604?: string;
	PX605?: string;
	PX606?: string;
	PX607?: string;
	PX608?: string;
	PX609?: string;
	PX610?: string;
	PX611?: string;
	PX612?: string;
	PX613?: string;
	PX614?: string;
	PX615?: string;
	PX616?: string;
	PX617?: string;
	PX618?: string;
	PX619?: string;
	PX620?: string;
	PX621?: string;
	PX622?: string;
	PX623?: string;
	PX624?: string;
	PX625?: string;
	PX626?: string;
	PX627?: string;
	PX628?: string;
	PX629?: string;
	PX630?: string;
	PX631?: string;
	PX632?: string;
	PX633?: string;
	PX635?: string;
	PX636?: string;
	PX637?: string;
	PX638?: string;
	PX639?: string;
	PX640?: string;
	PX641?: string;
	PX642?: string;
	PX643?: string;
	PX644?: string;
	PX645?: string;
	PX646?: string;
	PX647?: string;
	PX648?: string;
	PX649?: string;
	PX650?: string;
	PX651?: string;
	PX652?: string;
	PX653?: string;
	PX654?: string;
	PX655?: string;
	PX656?: string;
	PX657?: string;
	PX658?: string;
	PX659?: string;
	PX660?: string;
	PX661?: string;
	PX662?: string;
	PX663?: string;
	PX664?: string;
	PX665?: string;
	PX666?: string;
	PX667?: string;
	PX668?: string;
	PX669?: string;
	PX670?: string;
	PX671?: string;
	PX672?: string;
	PX673?: string;
	PX674?: string;
	PX675?: string;
	PX676?: string;
	PX677?: string;
	PX678?: string;
	PX679?: string;
	PX680?: string;
	PX681?: string;
	PX682?: string;
	PX683?: string;
	PX684?: string;
	PX685?: string;
	PX686?: string;
	PX687?: string;
	PX688?: string;
	PX689?: string;
	PX690?: string;
	PX691?: string;
	PX692?: string;
	PX693?: string;
	PX694?: string;
	PX695?: string;
	PX696?: string;
	PX697?: string;
	PX698?: string;
	PX699?: string;
	PX700?: string;
	PX701?: string;
	PX702?: string;
	PX703?: string;
	PX704?: string;
	PX705?: string;
	PX706?: string;
	PX707?: string;
	PX708?: string;
	PX709?: string;
	PX710?: string;
	PX711?: string;
	PX712?: string;
	PX713?: string;
	PX714?: string;
	PX715?: string;
	PX716?: string;
	PX717?: string;
	PX718?: string;
	PX719?: string;
	PX720?: string;
	PX721?: string;
	PX722?: string;
	PX723?: string;
	PX724?: string;
	PX725?: string;
	PX726?: string;
	PX727?: string;
	PX728?: string;
	PX729?: string;
	PX730?: string;
	PX731?: string;
	PX732?: string;
	PX733?: string;
	PX734?: string;
	PX735?: string;
	PX736?: string;
	PX737?: string;
	PX738?: string;
	PX739?: string;
	PX740?: string;
	PX741?: string;
	PX742?: string;
	PX743?: string;
	PX744?: string;
	PX745?: string;
	PX746?: string;
	PX747?: string;
	PX748?: string;
	PX749?: string;
	PX750?: string;
	PX751?: string;
	PX752?: string;
	PX753?: string;
	PX754?: string;
	PX755?: string;
	PX756?: string;
	PX757?: string;
	PX758?: string;
	PX759?: string;
	PX760?: string;
	PX761?: string;
	PX762?: string;
	PX763?: string;
	PX764?: string;
	PX765?: string;
	PX766?: string;
	PX767?: string;
	PX768?: string;
	PX769?: string;
	PX770?: string;
	PX771?: string;
	PX772?: string;
	PX773?: string;
	PX774?: string;
	PX775?: string;
	PX776?: string;
	PX777?: string;
	PX778?: string;
	PX779?: string;
	PX780?: string;
	PX781?: string;
	PX782?: string;
	PX783?: string;
	PX784?: string;
	PX785?: string;
	PX786?: string;
	PX787?: string;
	PX788?: string;
	PX789?: string;
	PX790?: string;
	PX791?: string;
	PX792?: string;
	PX793?: string;
	PX794?: string;
	PX795?: string;
	PX796?: string;
	PX797?: string;
	PX798?: string;
	PX799?: string;
	PX800?: string;
	PX801?: string;
	PX802?: string;
	PX803?: string;
	PX804?: string;
	PX805?: string;
	PX806?: string;
	PX807?: string;
	PX808?: string;
	PX809?: string;
	PX810?: string;
	PX811?: string;
	PX812?: string;
	PX813?: string;
	PX814?: string;
	PX815?: string;
	PX816?: string;
	PX817?: string;
	PX818?: string;
	PX819?: string;
	PX820?: string;
	PX821?: string;
	PX822?: string;
	PX823?: string;
	PX824?: string;
	PX825?: string;
	PX826?: string;
	PX827?: string;
	PX828?: string;
	PX829?: string;
	PX830?: string;
	PX831?: string;
	PX832?: string;
	PX833?: string;
	PX834?: string;
	PX835?: string;
	PX836?: string;
	PX837?: string;
	PX838?: string;
	PX839?: string;
	PX840?: string;
	PX841?: string;
	PX842?: string;
	PX843?: string;
	PX844?: string;
	PX845?: string;
	PX846?: string;
	PX847?: string;
	PX848?: string;
	PX849?: string;
	PX850?: string;
	PX851?: string;
	PX852?: string;
	PX853?: string;
	PX854?: string;
	PX855?: string;
	PX856?: string;
	PX857?: string;
	PX858?: string;
	PX859?: string;
	PX860?: string;
	PX861?: string;
	PX862?: string;
	PX863?: string;
	PX864?: string;
	PX865?: string;
	PX866?: string;
	PX867?: string;
	PX868?: string;
	PX869?: string;
	PX870?: string;
	PX871?: string;
	PX872?: string;
	PX873?: string;
	PX874?: string;
	PX875?: string;
	PX876?: string;
	PX877?: string;
	PX878?: string;
	PX879?: string;
	PX880?: string;
	PX881?: string;
	PX882?: string;
	PX883?: string;
	PX884?: string;
	PX885?: string;
	PX886?: string;
	PX887?: string;
	PX888?: string;
	PX889?: string;
	PX890?: string;
	PX891?: string;
	PX892?: string;
	PX893?: string;
	PX894?: string;
	PX895?: string;
	PX896?: string;
	PX897?: string;
	PX898?: string;
	PX899?: string;
	PX900?: string;
	PX901?: string;
	PX902?: string;
	PX903?: string;
	PX904?: string;
	PX905?: string;
	PX906?: string;
	PX907?: string;
	PX908?: string;
	PX909?: string;
	PX910?: string;
	PX911?: string;
	PX912?: string;
	PX913?: string;
	PX914?: string;
	PX915?: string;
	PX916?: string;
	PX917?: string;
	PX918?: string;
	PX919?: string;
	PX920?: string;
	PX921?: string;
	PX922?: string;
	PX923?: string;
	PX924?: string;
	PX925?: string;
	PX926?: string;
	PX927?: string;
	PX928?: string;
	PX929?: string;
	PX930?: string;
	PX931?: string;
	PX932?: string;
	PX933?: string;
	PX934?: string;
	PX935?: string;
	PX936?: string;
	PX937?: string;
	PX938?: string;
	PX939?: string;
	PX940?: string;
	PX941?: string;
	PX942?: string;
	PX943?: string;
	PX944?: string;
	PX945?: string;
	PX946?: string;
	PX947?: string;
	PX948?: string;
	PX949?: string;
	PX950?: string;
	PX951?: string;
	PX952?: string;
	PX953?: string;
	PX954?: string;
	PX955?: string;
	PX956?: string;
	PX957?: string;
	PX958?: string;
	PX959?: string;
	PX960?: string;
	PX961?: string;
	PX962?: string;
	PX963?: string;
	PX964?: string;
	PX965?: string;
	PX966?: string;
	PX967?: string;
	PX968?: string;
	PX969?: string;
	PX970?: string;
	PX971?: string;
	PX972?: string;
	PX973?: string;
	PX974?: string;
	PX975?: string;
	PX976?: string;
	PX977?: string;
	PX978?: string;
	PX979?: string;
	PX980?: string;
	PX981?: string;
	PX982?: string;
	PX983?: string;
	PX984?: string;
	PX985?: string;
	PX986?: string;
	PX987?: string;
	PX988?: string;
	PX989?: string;
	PX990?: string;
	PX991?: string;
	PX992?: string;
	PX993?: string;
	PX994?: string;
	PX995?: string;
	PX996?: string;
	PX997?: string;
	PX998?: string;
	PX999?: string;
	PX1000?: string;
	PX1001?: string;
	PX1002?: string;
	PX1003?: string;
	PX1004?: string;
	PX1005?: string;
	PX1006?: string;
	PX1007?: string;
	PX1008?: string;
	PX1009?: string;
	PX1010?: string;
	PX1011?: string;
	PX1012?: string;
	PX1013?: string;
	PX1014?: string;
	PX1015?: string;
	PX1016?: string;
	PX1017?: string;
	PX1018?: string;
	PX1019?: string;
	PX1020?: string;
	PX1021?: string;
	PX1022?: string;
	PX1023?: string;
	PX1024?: string;
	PX1025?: string;
	PX1026?: string;
	PX1027?: string;
	PX1028?: string;
	PX1029?: string;
	PX1030?: string;
	PX1031?: string;
	PX1032?: string;
	PX1033?: string;
	PX1034?: string;
	PX1035?: string;
	PX1036?: string;
	PX1037?: string;
	PX1038?: string;
	PX1039?: string;
	PX1040?: string;
	PX1041?: string;
	PX1042?: string;
	PX1043?: string;
	PX1044?: string;
	PX1045?: string;
	PX1046?: string;
	PX1047?: string;
	PX1048?: string;
	PX1049?: string;
	PX1050?: string;
	PX1051?: string;
	PX1052?: string;
	PX1053?: string;
	PX1054?: string;
	PX1055?: string;
	PX1056?: string;
	PX1057?: string;
	PX1058?: string;
	PX1059?: string;
	PX1060?: string;
	PX1061?: string;
	PX1062?: string;
	PX1063?: string;
	PX1064?: string;
	PX1065?: string;
	PX1066?: string;
	PX1067?: string;
	PX1068?: string;
	PX1069?: string;
	PX1070?: string;
	PX1071?: string;
	PX1072?: string;
	PX1073?: string;
	PX1074?: string;
	PX1075?: string;
	PX1076?: string;
	PX1077?: string;
	PX1078?: string;
	PX1079?: string;
	PX1080?: string;
	PX1081?: string;
	PX1082?: string;
	PX1083?: string;
	PX1084?: string;
	PX1085?: string;
	PX1086?: string;
	PX1087?: string;
	PX1088?: string;
	PX1089?: string;
	PX1090?: string;
	PX1091?: string;
	PX1092?: string;
	PX1093?: string;
	PX1094?: string;
	PX1095?: string;
	PX1096?: string;
	PX1097?: string;
	PX1098?: string;
	PX1099?: string;
	PX1100?: string;
	PX1101?: string;
	PX1102?: string;
	PX1103?: string;
	PX1104?: string;
	PX1105?: string;
	PX1106?: string;
	PX1107?: string;
	PX1108?: string;
	PX1109?: string;
	PX1110?: string;
	PX1111?: string;
	PX1112?: string;
	PX1113?: string;
	PX1114?: string;
	PX1115?: string;
	PX1116?: string;
	PX1117?: string;
	PX1118?: string;
	PX1119?: string;
	PX1120?: string;
	PX1121?: string;
	PX1122?: string;
	PX1123?: string;
	PX1124?: string;
	PX1125?: string;
	PX1126?: string;
	PX1127?: string;
	PX1128?: string;
	PX1129?: string;
	PX1130?: string;
	PX1159?: boolean;
	PX1208?: string;
	PX1214?: string;
	PX21215?: number;
	PX21217?: string;
	PX21218?: string;
	PX21221?: string;
	PX21219?: string;
}

interface PxResponse {
	do: string[];
}

export interface PxSolution {
	solveTime: number;
	site: string;
	sid: string;
	vid: string;
	headers: PxSolutionHeaders;
}

interface PxSolutionHeaders {
	[key: string]: string | undefined;

	"user-agent": string;
	"x-px-os-version"?: string;
	"x-px-uuid"?: string;
	"x-px-device-fp"?: string;
	"x-px-device-model"?: string;
	"x-px-os"?: string;
	"x-px-hello"?: string;
	"x-px-mobile-sdk-version"?: string;
	"x-px-authorization": string;
}

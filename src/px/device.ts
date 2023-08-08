import { readFile } from "fs/promises";
import { randomItem } from "@src/utils.js";

let devices: DeviceFingerprint[] | null = null;

export async function getRandomDevice() {
	if (devices === null) {
		const screenSizes = [
			// [480, 800],
			// [640, 1136],
			// [720, 1280],
			// [750, 1334],
			// [1080, 1920],
			// [1440, 2560],

			[480, 800],
			[480, 854],
			[768, 1280],
			[800, 1280],
			[1032, 1920],
			[1080, 1920],
			[1200, 1920],
			[1440, 2560],
			[1600, 2560],
		];
		const lines = await readFile("./resources/devices.csv", "utf8");

		devices = lines
			.split("\r\n")
			.slice(1)
			.map((line) => {
				const [
					buildId,
					buildDisplayId,
					productName,
					productDevice,
					productBoard,
					productManufacturer,
					productBrand,
					productModel,
					bootloader,
					hardware,
					buildType,
					buildTags,
					buildFingerprint,
					buildUser,
					buildHost,
					buildVersionIncremental,
					buildVersionRelease,
					buildVersionSdk,
					buildVersionCodename,
				] = line.split(",");

				const rect = randomItem(screenSizes);
				const device: DeviceFingerprint = {
					// TODO: Temporary solution
					// width: 1080,
					// height: 1920,
					// width: 720,
					// height: 1184,
					width: rect[0],
					height: rect[1],

					buildId,
					buildDisplayId,
					productName,
					productDevice,
					productBoard,
					productManufacturer,
					productBrand,
					productModel,
					bootloader,
					hardware,
					buildType,
					buildTags,
					buildFingerprint,
					buildUser,
					buildHost,
					buildVersionIncremental,
					buildVersionRelease,
					buildVersionSdk,
					buildVersionCode: "11",
					buildVersionCodename,
				};

				return device;
			});
	}

	return randomItem(devices);
}

export interface DeviceFingerprint {
	width: number;
	height: number;

	buildId: string;
	buildDisplayId: string;
	productName: string;
	productDevice: string;
	productBoard: string;
	productManufacturer: string;
	productBrand: string;
	productModel: string;
	bootloader: string;
	hardware: string;
	buildType: string;
	buildTags: string;
	buildFingerprint: string;
	buildUser: string;
	buildHost: string;
	buildVersionIncremental: string;
	buildVersionRelease: string;
	buildVersionSdk: string;
	buildVersionCode: string;
	buildVersionCodename: string;
}

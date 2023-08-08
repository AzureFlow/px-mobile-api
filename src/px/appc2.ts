export default function getChallengeResultFromString(appc2: string, model: string) {
	const parts = appc2.split("|").slice(1);

	// const ts = parseInt(parts[1]); // getTs
	// const signed = parts[2]; // getSigned
	const part3 = parseInt(parts[3]); // part3
	const part4 = parseInt(parts[4]); // part4
	const part5 = parseInt(parts[5]); // part5
	const part6 = parseInt(parts[6]); // part6
	const part7 = parseInt(parts[7]); // part7
	const part8 = parseInt(parts[8]); // part8

	return getChallengeResult(part5, part6, part7, part3, part4, part8, model);
}

function getChallengeResult(
	part5: number,
	part6: number,
	part7: number,
	part3: number,
	part4: number,
	part8: number,
	model: string,
) {
	// model = Build.MODEL
	const result = doRound(doRound(part5, part6, part3, part8), part7, part4, part8) ^ deviceModelAsInt(model);
	return result.toString();
}

function doRound(i: number, i2: number, i3: number, i4: number) {
	const i5 = i4 % 10;
	const i6 = i * i;
	const i7 = i2 * i2;

	switch (i5 != 0 ? i3 % i5 : i3 % 10) {
		case 0:
			return i6 + i2;
		case 1:
			return i + i7;
		case 2:
			return i6 * i2;
		case 3:
			return i ^ i2;
		case 4:
			return i - i7;
		case 5:
			// eslint-disable-next-line no-case-declarations
			const i8 = i + 783;
			return i8 * i8 + i7;
		case 6:
			return (i ^ i2) + i2;
		case 7:
			return i6 - i7;
		case 8:
			return i * i2;
		case 9:
			return i * i2 - i;
		default:
			return -1;
	}
}

// function deviceModelAsInt(model: string) {
//     const bArr = new TextEncoder().encode(model)
//     if(bArr.length < 4) {
//         console.log("ZERO");
//         return 0;
//     }
//
//     const dataView = new DataView(bArr.buffer);
//     return dataView.getUint32(0);
// }

function deviceModelAsInt(model: string) {
	// const a = Buffer.from(model);
	const a = new TextEncoder().encode(model);
	return ToInt32(a.slice(0, 4).reverse());
}

// function ToInt32(buffer: Buffer) {
function ToInt32(buffer: Uint8Array) {
	return (buffer[0] | (buffer[1] << 8) | (buffer[2] << 16) | (buffer[3] << 24)) >>> 0;
}

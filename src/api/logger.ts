import { pino } from "pino";
import env from "@src/env.js";

const p = pino(
	{
		level: "trace",
	},
	pino.transport({
		targets: [
			{
				level: "info",
				target: "@axiomhq/pino",
				options: {
					dataset: env.AXIOM_DATASET,
					token: env.AXIOM_TOKEN,
				},
			},
			{
				level: "trace",
				target: "pino-pretty",
				options: {
					colorize: true,
				},
			},
		],
	}),
	// multistream([
	//     pino.transport({
	//         target: "@axiomhq/pino",
	//         options: {
	//             dataset: env.AXIOM_DATASET,
	//             token: env.AXIOM_TOKEN,
	//         },
	//     }),
	//     {
	//         level: "trace",
	//         stream: process.stdout,
	//         prettyPrint: true,
	//     },
	//     // pino.transport({
	//     //     level: "trace",
	//     //     target: "pino-pretty",
	//     //     options: {
	//     //         colorize: true,
	//     //     },
	//     // }),
	// ]),
);
// const logger = p.child({
//     env: env.NODE_ENV,
// });

export default p;

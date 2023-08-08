import { migrate } from "drizzle-orm/mysql2/migrator";
import db from "@src/api/database/database.js";

migrate(db, { migrationsFolder: "./drizzle" })
	.then(() => {
		console.log("Migrations complete!");
		process.exit(0);
	})
	.catch((err) => {
		console.error("Migrations failed!", err);
		process.exit(1);
	});

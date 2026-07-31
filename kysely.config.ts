import { defineConfig } from "kysely-ctl";
import { db } from "./src/db/index.js";
import { PostgresDialect } from "kysely";
import { Pool } from "pg";
import dotenv from "dotenv";


dotenv.config({ path: ".env" });

export default defineConfig({
    kysely: db,
    migrations: {
        migrationFolder: "src/db/migrations",
    },
    seeds: {
        seedFolder: "src/db/seeds",
    },
});

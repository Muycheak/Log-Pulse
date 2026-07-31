import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import { Database } from "./types.js";
import dotenv from "dotenv";

const { Pool } = pg

dotenv.config({ path: ".env" });

const dialect = new PostgresDialect({
    pool: new Pool({
        connectionString: String(process.env.DATABASE_URL),
        max: 10, // Max connection pool size
    }),
})

// Central Kysely database instance
export const db = new Kysely<Database>({
    dialect,
})
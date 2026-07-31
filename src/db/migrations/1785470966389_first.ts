import type { Kysely } from 'kysely'
import { sql } from 'kysely'

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function up(db: Kysely<any>): Promise<void> {
	await db.schema
		.createTable('users')
		.addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
		.addColumn('email', 'varchar(255)', (col) => col.notNull().unique())
		.addColumn('password_hash', 'text', (col) => col.notNull())
		.addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
		.execute()

	await db.schema
		.createTable('projects')
		.addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
		.addColumn('user_id', 'uuid', (col) => col.notNull().references('users.id').onDelete('cascade'))
		.addColumn('name', 'varchar(255)', (col) => col.notNull())
		.addColumn('api_key_hash', 'text', (col) => col.notNull().unique())
		.addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
		.execute()

	await db.schema
		.createType('log_level')
		.asEnum(['debug', 'info', 'warn', 'error', 'fatal'])
		.execute()

	await db.schema
		.createTable('logs')
		.addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
		.addColumn('project_id', 'uuid', (col) => col.notNull().references('projects.id').onDelete('cascade'))
		.addColumn('level', sql`log_level`, (col) => col.notNull())
		.addColumn('message', 'text', (col) => col.notNull())
		.addColumn('metadata', 'jsonb', (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
		.addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
		.execute()
}

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable('logs').execute()
	await db.schema.dropType('log_level').execute()
	await db.schema.dropTable('projects').execute()
	await db.schema.dropTable('users').execute()
}

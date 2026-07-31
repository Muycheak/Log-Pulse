import { Generated, ColumnType } from 'kysely'

export interface UsersTable {
    id: Generated<string>
    email: string
    password_hash: string
    created_at: Generated<Date>
}

export interface ProjectsTable {
    id: Generated<string>
    user_id: string
    name: string
    api_key_hash: string
    created_at: Generated<Date>
}

export interface LogEntriesTable {
    id: Generated<string>
    project_id: string
    level: 'debug' | 'info' | 'warn' | 'error' | 'fatal'
    message: string
    metadata: ColumnType<unknown, Record<string, unknown>>
    created_at: Generated<Date>
}

export interface Database {
    users: UsersTable
    projects: ProjectsTable
    logs: LogEntriesTable
}
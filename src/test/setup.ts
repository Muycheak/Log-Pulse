import { db } from '../db/index.js'

export async function clearDatabase() {
    await db.deleteFrom('logs').execute()
    await db.deleteFrom('projects').execute()
    await db.deleteFrom('users').execute()
}
import { Hono } from "hono";
import { db } from "../db/index.js";

const users = new Hono();

const getUsers = async (c: any) => {
    const users = await db.selectFrom('users').select(['id', 'email']).execute()
    return c.json({
        success: true,
        message: 'Users retrieved successfully',
        data: users
    })
}

users.get('/', getUsers)
users.get('', getUsers)

export default users;
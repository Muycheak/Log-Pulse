import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { loginSchema, registerSchema } from "../validators/auth.js";
import { db } from "../db/index.js";
import bcrypt from 'bcryptjs'
import generateToken from "../helpers/auth.js";

const auth = new Hono();

auth.post('/login', zValidator('json', loginSchema), async (c) => {
    const { email, password } = c.req.valid('json')

    const user = await db.selectFrom('users').select(['id', 'email', 'password_hash']).where('email', '=', email).executeTakeFirst()

    if (!user) {
        return c.json({
            success: false,
            message: 'Invalid email or password'
        }, 401)
    }

    // Verify password match
    const isPasswordValid = await bcrypt.compare(password, user.password_hash)
    if (!isPasswordValid) {
        return c.json({
            success: false,
            message: 'Invalid email or password'
        }, 401)
    }

    // Generate JWT token
    const token = await generateToken(user.id, user.email)

    return c.json({
        success: true,
        message: 'Login successful',
        data: {
            token,
            user: {
                id: user.id,
                email: user.email,
            },
        }
    })
});

auth.post('/register', zValidator('json', registerSchema), async (c) => {
    const { email, password } = c.req.valid('json')

    const user = await db.selectFrom('users').select(['id', 'email', 'password_hash']).where('email', '=', email).executeTakeFirst()

    if (user) {
        return c.json({
            success: false,
            message: 'User already exists'
        }, 409)
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create user
    const newUser = await db.insertInto('users').values({
        email,
        password_hash: passwordHash,
    }).returning(['id', 'email']).executeTakeFirst()

    if (!newUser) {
        return c.json({
            success: false,
            message: 'Failed to create user'
        }, 500)
    }

    // Generate JWT token
    const token = await generateToken(newUser.id, newUser.email)

    return c.json({
        success: true,
        message: 'User created successfully',
        data: {
            token,
            user: {
                id: newUser.id,
                email: newUser.email,
            },
        }
    }, 201)
});

export default auth;
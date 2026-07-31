import { sign } from "hono/jwt"
import { env } from "../env.js"

const TOKEN_EXPIRATION_SECONDS = 60 * 60 * 24

async function generateToken(userId: string, email: string): Promise<string> {
    const payload = {
        sub: userId,
        email,
        exp: Math.floor(Date.now() / 1000) + TOKEN_EXPIRATION_SECONDS,
    }
    return await sign(payload, env.JWT_SECRET)
}


export default generateToken
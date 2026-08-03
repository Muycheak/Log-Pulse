import type { MiddlewareHandler } from 'hono'
import { jwt } from 'hono/jwt'
import { env } from '../env.js'

// Declare custom variables on Hono's Context Env so c.get('userId') is fully typed
export type AuthEnv = {
  Variables: {
    userId: string
    jwtPayload: {
      sub: string
      email: string
      exp: number
    }
  }
}

// 1. Native Hono JWT Middleware
export const jwtMiddleware = jwt({
    secret: env.JWT_SECRET,
    alg: 'HS256'
})

// 2. Custom Wrapper to extract userId into Hono context
export const requireAuth: MiddlewareHandler<AuthEnv> = async (c, next) => {
  // Run standard JWT verification
  await jwtMiddleware(c, async () => {})

  const payload = c.get('jwtPayload')
  if (!payload || !payload.sub) {
    return c.json({ error: 'Unauthorized: Invalid token payload' }, 401)
  }

  // Set userId for downstream handlers
  c.set('userId', payload.sub)
  await next()
}
import type { MiddlewareHandler } from 'hono'

interface RateLimitOptions {
  windowMs: number // Time window in milliseconds
  max: number      // Max requests allowed per window
  message?: string
}

interface ClientRecord {
  count: number
  resetTime: number
}

export const rateLimiter = (options: RateLimitOptions): MiddlewareHandler => {
  const clients = new Map<string, ClientRecord>()

  // Periodically clean up expired entries to avoid memory leaks
  setInterval(() => {
    const now = Date.now()
    for (const [key, record] of clients.entries()) {
      if (now > record.resetTime) {
        clients.delete(key)
      }
    }
  }, options.windowMs)

  return async (c, next) => {
    // Identify by X-API-Key if present, otherwise fall back to client IP/Header
    const key =
      c.req.header('X-API-Key') ||
      c.req.header('x-forwarded-for') ||
      'anonymous'

    const now = Date.now()
    const record = clients.get(key)

    if (!record || now > record.resetTime) {
      clients.set(key, {
        count: 1,
        resetTime: now + options.windowMs,
      })
    } else {
      record.count += 1

      if (record.count > options.max) {
        return c.json(
          {
            error: options.message || 'Too many requests, please try again later.',
            retryAfterSeconds: Math.ceil((record.resetTime - now) / 1000),
          },
          429
        )
      }
    }

    await next()
  }
}
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { env } from './env.js'
import auth from './routes/auth.js'
import users from './routes/users.js'
import projects from './routes/projects.js'
import logs from './routes/v1/logs.js'
import { rateLimiter } from './middlewares/rateLimiter.js'
import { HTTPException } from 'hono/http-exception'

const app = new Hono()

// Global Middlewares
app.use('*', logger()) // Logs incoming HTTP requests to console
app.use('*', cors())   // Enables CORS for API consumers
app.use(
  '*',
  rateLimiter({
    windowMs: 60 * 1000,
    max: 100,
    message: 'Rate limit exceeded: 100 requests per minute limit.',
  })
)  // Rate limiting middleware to prevent abuse

// 404 Not Found Handler
app.notFound((c) => {
  return c.json(
    {
      error: 'Not Found',
      message: `Cannot ${c.req.method} ${c.req.path}`,
    },
    404
  )
})

// Global Error Handler
app.onError((err, c) => {
  console.error(`[Unhandled Error] ${c.req.method} ${c.req.path}:`, err)

  // Handle Hono HTTP exceptions
  if (err instanceof HTTPException) {
    return err.getResponse()
  }

  // Hide internal database errors in production
  const isProduction = env.NODE_ENV === 'production'
  return c.json(
    {
      error: 'Internal Server Error',
      message: isProduction ? 'An unexpected error occurred' : err.message,
    },
    500
  )
})

// Health Check
app.get('/health', (c) => {
    return c.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: env.NODE_ENV,
    })
})

app.route('/api/auth', auth)

app.route('/api/users', users)

app.route('/api/projects', projects)

app.route('/api/v1/logs', logs)

app.get('/', serveStatic({ root: './web/dist', path: '/index.html' }))
app.get('/login', serveStatic({ root: './web/dist', path: '/index.html' }))
app.get('/register', serveStatic({ root: './web/dist', path: '/index.html' }))
app.get('/dashboard', serveStatic({ root: './web/dist', path: '/index.html' }))
app.get('/assets/*', serveStatic({ root: './web/dist' }))
app.get('/favicon.svg', serveStatic({ root: './web/dist' }))

// Start server using node-server runner
serve(
    {
        fetch: app.fetch,
        port: env.PORT,
    },
    (info) => {
        console.log(`🚀 Server running at http://localhost:${info.port}`)
    }
)

export default app
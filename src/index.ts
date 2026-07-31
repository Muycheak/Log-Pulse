import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { env } from './env.js'
import auth from './routes/auth.js'

const app = new Hono()

// Global Middlewares
app.use('*', logger()) // Logs incoming HTTP requests to console
app.use('*', cors())   // Enables CORS for API consumers

// Health Check
app.get('/health', (c) => {
    return c.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: env.NODE_ENV,
    })
})

app.route('/api/auth/', auth)

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
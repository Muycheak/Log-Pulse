import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { env } from './env.js'
import auth from './routes/auth.js'
import users from './routes/users.js'
import projects from './routes/projects.js'
import logs from './routes/v1/logs.js'

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

app.route('/api/auth', auth)

app.route('/api/users', users)

app.route('/api/projects', projects)

app.route('/api/v1/logs', logs)

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
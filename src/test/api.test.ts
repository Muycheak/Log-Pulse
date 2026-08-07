import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { clearDatabase } from './setup.js'
import { db } from '../db/index.js'
import app from '../index.js'

describe('LogPulse End-to-End API Suite', () => {
    beforeEach(async () => {
        await clearDatabase()
    })

    afterAll(async () => {
        await db.destroy()
    })

    it('should run complete authentication, project creation, and log lifecycle', async () => {
        // --- 1. USER REGISTRATION ---
        const regRes = await app.request('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'dev@example.com',
                password: 'password123',
            }),
        })

        expect(regRes.status).toBe(201)
        const regData = await regRes.json()
        expect(regData.data.token).toBeDefined()
        expect(regData.data.user.email).toBe('dev@example.com')

        const jwtToken = regData.data.token

        // --- 2. CREATE A PROJECT ---
        const projRes = await app.request('/api/projects', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${jwtToken}`,
            },
            body: JSON.stringify({
                name: 'My Backend App',
            }),
        })

        expect(projRes.status).toBe(201)
        const projData = await projRes.json()
        expect(projData.data.project.id).toBeDefined()
        expect(projData.apiKey).toMatch(/^lp_live_/)

        const projectId = projData.data.project.id
        const apiKey = projData.apiKey

        // --- 3. INGEST A LOG (API KEY AUTH) ---
        const logRes = await app.request('/api/v1/logs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey,
            },
            body: JSON.stringify({
                level: 'error',
                message: 'Database connection failed',
                metadata: { attempts: 3 },
            }),
        })

        expect(logRes.status).toBe(201)
        const logData = await logRes.json()
        expect(logData.log.level).toBe('error')

        // --- 4. QUERY LOGS (JWT AUTH) ---
        const queryRes = await app.request(
            `/api/v1/logs?projectId=${projectId}&level=error`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${jwtToken}`,
                },
            }
        )

        expect(queryRes.status).toBe(200)
        const queryData = await queryRes.json()
        expect(queryData.count).toBe(1)
        expect(queryData.logs[0].message).toBe('Database connection failed')
    })

    it('should reject log ingestion with an invalid API Key', async () => {
        const logRes = await app.request('/api/v1/logs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': 'lp_live_invalid_key',
            },
            body: JSON.stringify({
                level: 'info',
                message: 'Test message',
            }),
        })

        expect(logRes.status).toBe(401)
    })
})
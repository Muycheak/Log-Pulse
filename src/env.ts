import dotenv from 'dotenv'
import { z } from 'zod'

// Load variables from .env file into process.env
dotenv.config()

// Define schema for required environment variables
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string().url({ message: 'DATABASE_URL must be a valid connection string' }),
    JWT_SECRET: z.string().min(16, { message: 'JWT_SECRET must be at least 16 characters long' }),
})

// Safely parse process.env
const parseResult = envSchema.safeParse(process.env)

if (!parseResult.success) {
    console.error('❌ Invalid environment variables:')
    console.error(JSON.stringify(parseResult.error.format(), null, 2))
    process.exit(1)
}

// Export the typed environment variables
export const env = parseResult.data
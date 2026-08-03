import { z } from "zod"

const ingestLogSchema = z.object({
  level: z.enum(['info', 'warn', 'error'], {
    message: "Level must be 'info', 'warn', or 'error'",
  }),
  message: z.string().min(1, { message: 'Log message cannot be empty' }),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

const queryLogsSchema = z.object({
  projectId: z.string().uuid({ message: 'Invalid project ID format' }),
  level: z.enum(['info', 'warn', 'error'], {
    message: "Level must be 'info', 'warn', or 'error'",
  }).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
})

export { ingestLogSchema, queryLogsSchema }
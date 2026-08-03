import { Hono } from "hono";
import { requireAuth, type AuthEnv } from '../../middlewares/auth.js'
import { zValidator } from "@hono/zod-validator";
import { ingestLogSchema, queryLogsSchema } from "../../validators/logs.js";
import { db } from "../../db/index.js";
import { hashApiKey } from "../../helpers/apikey.js";


const logs = new Hono();

// 1. Ingest Log
const ingestLog = async (c: any) => {
  const apiKey = c.req.header('X-API-Key')
  
  if (!apiKey) {
    return c.json({ 
        success: false,
        message: 'Unauthorized: Missing X-API-Key header' }, 401)
  }

  // Hash incoming key deterministically and match with the stored project lookup hash
  const apiKeyHash = await hashApiKey(apiKey)
  const project = await db
    .selectFrom('projects')
    .select('id')
    .where('api_key_hash', '=', apiKeyHash)
    .executeTakeFirst()

  if (!project) {
    return c.json({ 
        success: false,
        message: 'Unauthorized: Invalid API Key' }, 401)
  }

  const { level, message, metadata } = c.req.valid('json')

  // Save log entry to database
  const log = await db
    .insertInto('logs')
    .values({
      project_id: project.id,
      level,
      message,
      metadata: metadata ?? {},
    })
    .returning(['id', 'level', 'message', 'metadata', 'created_at'])
    .executeTakeFirstOrThrow()

  return c.json(
    {
      success: true,
      message: 'Log recorded successfully',
      log: {
        id: log.id,
        level: log.level,
        message: log.message,
        metadata: log.metadata,
        createdAt: log.created_at,
      },
    },
    201
  )
}

// 2. List Logs for a Project
const queryLogs = async (c: any) => {
  const userId = c.get('userId')
  const { projectId, level, limit, offset } = c.req.valid('query')

  // Verify that the requested project belongs to the logged-in user
  const project = await db
    .selectFrom('projects')
    .select('id')
    .where('id', '=', projectId)
    .where('user_id', '=', userId)
    .executeTakeFirst()

  if (!project) {
    return c.json({ success: false, message: 'Project not found or unauthorized' }, 404)
  }

  // Build dynamic Kysely query with filters
  let query = db
    .selectFrom('logs')
    .select(['id', 'level', 'message', 'metadata', 'created_at'])
    .where('project_id', '=', projectId)

  if (level) {
    query = query.where('level', '=', level)
  }

  // Fetch paginated logs ordered by newest first
  const logs = await query
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset)
    .execute()

  return c.json({
    success: true,
    message: 'Logs retrieved successfully',
    data: logs,
  })
}



logs.use('*', requireAuth)

logs.get('/', zValidator('query', queryLogsSchema), queryLogs)
logs.get('', zValidator('query', queryLogsSchema), queryLogs)
logs.post('/', zValidator('json', ingestLogSchema), ingestLog)
logs.post('', zValidator('json', ingestLogSchema), ingestLog)

export default logs;

import { Hono } from "hono";
import { requireAuth, type AuthEnv } from "../middlewares/auth.js";
import { createProjectSchema } from "../validators/projects.js";
import { db } from "../db/index.js";
import { zValidator } from "@hono/zod-validator";
import bcrypt from 'bcryptjs'
import { randomBytes } from "crypto";
import { hashApiKey } from "../helpers/apikey.js";

const projects = new Hono<AuthEnv>();

projects.use('*', requireAuth)



// 1. Create a new Project & generate API Key
const createProject = async (c: any) => {
  const userId = c.get('userId')
  const { name } = c.req.valid('json')

  // Generate secure random API key: lp_live_<32_random_hex_chars>
  const rawApiKey = `lp_live_${randomBytes(16).toString('hex')}`
  const apiKeyHash = await hashApiKey(rawApiKey)

  // Save project with hashed API key
  const project = await db
    .insertInto('projects')
    .values({
      user_id: userId,
      name,
      api_key_hash: apiKeyHash,
    })
    .returning(['id', 'name', 'api_key_hash', 'created_at'])
    .executeTakeFirstOrThrow()

  return c.json(
    {
      success: true,
      message: 'Project created successfully',
      data: {
        id: project.id,
        name: project.name,
        createdAt: project.created_at,
      },
      apiKey: rawApiKey,
      note: 'Please save this API Key securely. It will not be displayed again!',
    },
    201
  )
}

// 2. List all projects for logged-in user
const listAllProjects = async (c: any) => {
  const userId = c.get('userId')

  const userProjects = await db
    .selectFrom('projects')
    .select(['id', 'name', 'api_key_hash', 'created_at'])
    .where('user_id', '=', userId)
    .orderBy('created_at', 'desc')
    .execute()

  return c.json({
    success: true,
    message: 'Projects retrieved successfully',
    data: userProjects,
  })
}

projects.get('', listAllProjects)
projects.post('', zValidator('json', createProjectSchema), createProject)
projects.get('/', listAllProjects)
projects.post('/',  zValidator('json', createProjectSchema), createProject)

export default projects

# LogPulse

LogPulse is a lightweight log ingestion and project management API built with TypeScript, Hono, Kysely, and PostgreSQL.

It provides:

- User registration and login with JWT authentication
- Project creation, listing, and deletion
- API key generation for project-based log ingestion
- Log ingestion through the `X-API-Key` header
- Log querying for authenticated project owners

## Tech Stack

- TypeScript
- Hono
- Kysely
- PostgreSQL
- JWT via Hono JWT middleware
- Zod validation
- bcryptjs for password hashing
- SHA-256 for deterministic API key lookup hashing

## Project Structure

```text
src/
  db/                  Database access, types, and migrations
  helpers/             Helpers for auth and API key hashing
  middlewares/         Auth middleware
  routes/              API routes
  validators/          Input validation using Zod
  env.ts               Environment configuration
  index.ts             App bootstrap
```

## Requirements

Before running the project, make sure you have:

- Node.js 18+
- pnpm
- PostgreSQL running locally or remotely

## Environment Variables

Create a `.env` file in the project root with the following values:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://username:password@localhost:5432/logpulse
JWT_SECRET=your-super-secret-jwt-key-at-least-16-chars
```

## Install Dependencies

```bash
pnpm install
```

## Run Database Migrations

```bash
pnpm migrate:latest
```

## Start the Server

Development mode:

```bash
pnpm dev
```

Production-style run:

```bash
pnpm start
```

## API Overview

### Authentication

Base route:

```text
/api/auth
```

Endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`

### Users

```text
/api/users
```

Endpoints:

- `GET /api/users`

### Projects

```text
/api/projects
```

Endpoints:

- `POST /api/projects` — create a project and generate a new API key
- `GET /api/projects` — list projects for the authenticated user
- `DELETE /api/projects/:projectId` — delete a project by ID

### Logs

```text
/api/v1/logs
```

Endpoints:

- `POST /api/v1/logs` — ingest a log entry using the `X-API-Key` header
- `GET /api/v1/logs` — query logs for a project

## Example Requests

### Register a user

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "demo@example.com",
  "password": "password123"
}
```

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "demo@example.com",
  "password": "password123"
}
```

### Create a project

```http
POST /api/projects
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "name": "My Project"
}
```

### Ingest a log

```http
POST /api/v1/logs
X-API-Key: lp_live_<generated-key>
Content-Type: application/json

{
  "level": "info",
  "message": "Service started",
  "metadata": {
    "service": "auth"
  }
}
```

### Query logs

```http
GET /api/v1/logs?projectId=<project-uuid>&level=info&limit=20&offset=0
Authorization: Bearer <jwt-token>
```

## Notes

- The API key returned when creating a project is shown only once. Save it securely.
- Project ownership is enforced by checking `user_id` against the authenticated JWT user.
- The log ingestion endpoint validates the API key hash against the stored project hash.

## License

ISC

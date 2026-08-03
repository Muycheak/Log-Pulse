import { createHash } from 'node:crypto'

async function hashApiKey(key: string): Promise<string> {
  return createHash('sha256').update(key).digest('hex')
}

export { hashApiKey }
import bcrypt from "bcryptjs";

async function hashApiKey(key: string): Promise<string> {
  return bcrypt.hash(key, 12)
}

export { hashApiKey }
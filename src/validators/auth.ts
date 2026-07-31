import { z } from "zod";

const registerSchema = z.object({
    email: z.email({ message: 'Invalid email address' }),
    password: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
});

const loginSchema = z.object({
    email: z.email({ message: 'Invalid email address' }),
    password: z.string().min(1, { message: 'Password is required' }),
});

export { registerSchema, loginSchema };
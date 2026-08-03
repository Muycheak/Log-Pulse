import z from "zod";

const createProjectSchema = z.object({
  name: z.string().min(2, { message: 'Project name must be at least 2 characters long' }),
})

export { createProjectSchema };
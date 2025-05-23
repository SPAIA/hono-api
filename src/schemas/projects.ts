import { z } from 'zod'

export const ProjectSchema = z.object({
    id: z.number().int().positive(),
    title: z.string().max(255),
    short_description: z.string().max(255).optional(),
    long_description: z.string().optional(),
    location: z.any().optional() // TODO: Add proper geometry validation
})

export const CreateProjectSchema = ProjectSchema.omit({ id: true })
export const UpdateProjectSchema = CreateProjectSchema.partial()

import { z } from 'zod'
import { DeviceSchema, CreateDeviceSchema } from './devices'

export const ProjectSchema = z.object({
    id: z.number().int().positive(),
    title: z.string().max(255),
    short_description: z.string().max(255).optional(),
    long_description: z.string().optional(),
    location: z.any().optional(), // TODO: Add proper geometry validation
    longitude: z.number().optional(),
    latitude: z.number().optional(),
    devices: z.array(DeviceSchema).optional().describe("List of connected devices")
})

export const CreateProjectSchema = ProjectSchema.omit({ id: true }).extend({
    devices: z.array(CreateDeviceSchema).optional().describe("List of connected devices")
})
export const UpdateProjectSchema = CreateProjectSchema.partial()

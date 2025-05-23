import { Hono } from 'hono'
import { z } from 'zod'
import { ProjectSchema, CreateProjectSchema, UpdateProjectSchema } from '../schemas/projects'
import {
    getProjects,
    getProjectById,
    createProject,
    updateProject,
    deleteProject
} from '../services/projects'

const projects = new Hono()

projects.get('/', async (c) => {
    try {
        const projects = await getProjects()
        return c.json({ data: projects })
    } catch (error) {
        return c.json({
            error: 'Failed to fetch projects',
            details: error instanceof Error ? error.message : String(error)
        }, 500)
    }
})

projects.get('/:id', async (c) => {
    const id = z.coerce.number().parse(c.req.param('id'))

    try {
        const project = await getProjectById(id)
        if (!project) {
            return c.json({
                error: 'Project not found',
                details: `Project with ID ${id} does not exist`
            }, 404)
        }
        return c.json({ data: project })
    } catch (error) {
        return c.json({
            error: 'Failed to fetch project',
            details: error instanceof Error ? error.message : String(error)
        }, 500)
    }
})

projects.post('/', async (c) => {
    const data = await c.req.json()
    const validated = CreateProjectSchema.parse(data)

    try {
        const project = await createProject(validated)
        return c.json({ data: project }, 201)
    } catch (error) {
        return c.json({
            error: 'Failed to create project',
            details: error instanceof Error ? error.message : String(error)
        }, 500)
    }
})

projects.put('/:id', async (c) => {
    const id = z.coerce.number().parse(c.req.param('id'))
    const data = await c.req.json()
    const validated = UpdateProjectSchema.parse(data)

    try {
        const project = await updateProject(id, validated)
        if (!project) {
            return c.json({
                error: 'Project not found',
                details: `Project with ID ${id} does not exist`
            }, 404)
        }
        return c.json({ data: project })
    } catch (error) {
        return c.json({
            error: 'Failed to update project',
            details: error instanceof Error ? error.message : String(error)
        }, 500)
    }
})

projects.delete('/:id', async (c) => {
    const id = z.coerce.number().parse(c.req.param('id'))

    try {
        const project = await deleteProject(id)
        if (!project) {
            return c.json({
                error: 'Project not found',
                details: `Project with ID ${id} does not exist`
            }, 404)
        }
        return c.json({ data: project })
    } catch (error) {
        return c.json({
            error: 'Failed to delete project',
            details: error instanceof Error ? error.message : String(error)
        }, 500)
    }
})

export default projects

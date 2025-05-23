import { ProjectSchema, CreateProjectSchema, UpdateProjectSchema } from '../schemas/projects'
import { sql } from '../db/client'

export async function getProjects() {
    const { rows } = await sql`SELECT * FROM "Projects"`
    return rows
}

export async function getProjectById(id: number) {
    const { rows } = await sql`SELECT * FROM "Projects" WHERE id = ${id}`
    return rows[0]
}

export async function createProject(data: typeof CreateProjectSchema._type) {
    const { rows } = await sql`
    INSERT INTO "Projects" (title, short_description, long_description, location)
    VALUES (${data.title}, ${data.short_description}, ${data.long_description}, ${data.location})
    RETURNING *
  `
    return rows[0]
}

export async function updateProject(id: number, data: typeof UpdateProjectSchema._type) {
    const { rows } = await sql`
    UPDATE "Projects"
    SET 
      title = ${data.title},
      short_description = ${data.short_description},
      long_description = ${data.long_description},
      location = ${data.location}
    WHERE id = ${id}
    RETURNING *
  `
    return rows[0]
}

export async function deleteProject(id: number) {
    const { rows } = await sql`
    DELETE FROM "Projects" 
    WHERE id = ${id}
    RETURNING *
  `
    return rows[0]
}

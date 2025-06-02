import { ProjectSchema, CreateProjectSchema, UpdateProjectSchema } from '../schemas/projects'


export async function getProjects(sql: any) {
  const projects = await sql`
    SELECT 
      p.*,
      ST_X(p.location) as longitude,
      ST_Y(p.location) as latitude,
      COALESCE(
        json_agg(
          json_build_object(
            'id', d.id,
            'typeId', d."typeId",
            'name', d.name,
            'serial', d.serial,
            'notes', d.notes,
            'updatedBy', d."updatedBy",
            'createdAt', d."createdAt",
            'createdBy', d."createdBy",
            'updatedAt', d."updatedAt",
            'ip', d.ip
          )
        ) FILTER (WHERE pd."projectId" IS NOT NULL),
        '[]'::json
      ) as devices
    FROM "Projects" p
    LEFT JOIN "ProjectDevices" pd ON p.id = pd."projectId"
    LEFT JOIN "Devices" d ON pd."deviceId" = d.id
    GROUP BY p.id
  `
  return projects
}

export async function getProjectById(sql: any, id: number) {
  const [project] = await sql`
    SELECT 
      p.*,
      ST_X(p.location) as longitude,
      ST_Y(p.location) as latitude,
      COALESCE(
        json_agg(
          json_build_object(
            'id', d.id,
            'typeId', d."typeId",
            'name', d.name,
            'serial', d.serial,
            'notes', d.notes,
            'updatedBy', d."updatedBy",
            'createdAt', d."createdAt",
            'createdBy', d."createdBy",
            'updatedAt', d."updatedAt",
            'ip', d.ip
          )
        ) FILTER (WHERE pd."projectId" IS NOT NULL),
        '[]'::json
      ) as devices
    FROM "Projects" p
    LEFT JOIN "ProjectDevices" pd ON p.id = pd."projectId"
    LEFT JOIN "Devices" d ON pd."deviceId" = d.id
    WHERE p.id = ${id}
    GROUP BY p.id
  `
  return project
}

export async function createProject(sql: any, data: typeof CreateProjectSchema._type) {
  const [project] = await sql`
    INSERT INTO "Projects" (title, short_description, long_description, location)
    VALUES (${data.title}, ${data.short_description}, ${data.long_description}, ${data.location})
    RETURNING *
  `
  return project
}

export async function updateProject(sql: any, id: number, data: typeof UpdateProjectSchema._type) {
  const [project] = await sql`
    UPDATE "Projects"
    SET 
      title = ${data.title},
      short_description = ${data.short_description},
      long_description = ${data.long_description},
      location = ${data.location},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `
  return project
}

export async function deleteProject(sql: any, id: number) {
  const [project] = await sql`
    DELETE FROM "Projects" 
    WHERE id = ${id}
    RETURNING *
  `
  return project
}

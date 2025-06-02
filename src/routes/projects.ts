import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { ProjectSchema, CreateProjectSchema, UpdateProjectSchema } from "../schemas/projects";
import postgres from "postgres";
import { z } from "zod";
import {
    getProjects,
    getProjectById,
    createProject,
    updateProject,
    deleteProject
} from "../services/projects";
import type { CFEnv } from "../types";

const projects = new OpenAPIHono<CFEnv>();

const ErrorResponseSchema = z.object({
    error: z.string(),
    details: z.string(),
});

const ProjectsResponseSchema = z.object({
    data: z.array(ProjectSchema)
});

const ProjectResponseSchema = z.object({
    data: ProjectSchema
});

const getProjectsRoute = createRoute({
    method: "get",
    path: "/projects",
    tags: ["Projects"],
    summary: "Get all projects",
    responses: {
        200: {
            description: "Success",
            content: {
                "application/json": {
                    schema: ProjectsResponseSchema,
                },
            },
        },
        500: {
            description: "Server error",
            content: {
                "application/json": {
                    schema: ErrorResponseSchema,
                },
            },
        },
    },
});

const getProjectRoute = createRoute({
    method: "get",
    path: "/projects/{id}",
    tags: ["Projects"],
    summary: "Get a project by ID",
    request: {
        params: z.object({
            id: z.string(),
        }),
    },
    responses: {
        200: {
            description: "Success",
            content: {
                "application/json": {
                    schema: ProjectResponseSchema,
                },
            },
        },
        404: {
            description: "Not found",
            content: {
                "application/json": {
                    schema: ErrorResponseSchema,
                },
            },
        },
        500: {
            description: "Server error",
            content: {
                "application/json": {
                    schema: ErrorResponseSchema,
                },
            },
        },
    },
});

const createProjectRoute = createRoute({
    method: "post",
    path: "/projects",
    tags: ["Projects"],
    summary: "Create a new project",
    request: {
        body: {
            content: {
                "application/json": {
                    schema: CreateProjectSchema,
                },
            },
        },
    },
    responses: {
        201: {
            description: "Created",
            content: {
                "application/json": {
                    schema: ProjectResponseSchema,
                },
            },
        },
        500: {
            description: "Server error",
            content: {
                "application/json": {
                    schema: ErrorResponseSchema,
                },
            },
        },
    },
});

const updateProjectRoute = createRoute({
    method: "put",
    path: "/projects/{id}",
    tags: ["Projects"],
    summary: "Update a project",
    request: {
        params: z.object({
            id: z.string(),
        }),
        body: {
            content: {
                "application/json": {
                    schema: UpdateProjectSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: "Success",
            content: {
                "application/json": {
                    schema: ProjectResponseSchema,
                },
            },
        },
        404: {
            description: "Not found",
            content: {
                "application/json": {
                    schema: ErrorResponseSchema,
                },
            },
        },
        500: {
            description: "Server error",
            content: {
                "application/json": {
                    schema: ErrorResponseSchema,
                },
            },
        },
    },
});

const deleteProjectRoute = createRoute({
    method: "delete",
    path: "/projects/{id}",
    tags: ["Projects"],
    summary: "Delete a project",
    request: {
        params: z.object({
            id: z.string(),
        }),
    },
    responses: {
        200: {
            description: "Success",
            content: {
                "application/json": {
                    schema: ProjectResponseSchema,
                },
            },
        },
        404: {
            description: "Not found",
            content: {
                "application/json": {
                    schema: ErrorResponseSchema,
                },
            },
        },
        500: {
            description: "Server error",
            content: {
                "application/json": {
                    schema: ErrorResponseSchema,
                },
            },
        },
    },
});

projects.openapi(getProjectsRoute, async (c) => {
    try {
        const sql = postgres(c.env?.HYPERDRIVE?.connectionString);

        const projects = await getProjects(sql);
        return c.json({ data: projects });
    } catch (error) {
        return c.json({
            error: 'Failed to fetch projects',
            details: error instanceof Error ? error.message : String(error)
        }, 500);
    }
});

projects.openapi(getProjectRoute, async (c) => {
    const { id } = c.req.valid("param");

    try {
        const sql = postgres(c.env?.HYPERDRIVE?.connectionString);
        const project = await getProjectById(sql, Number(id));
        if (!project) {
            return c.json({
                error: 'Project not found',
                details: `Project with ID ${id} does not exist`
            }, 404);
        }
        return c.json({ data: project });
    } catch (error) {
        return c.json({
            error: 'Failed to fetch project',
            details: error instanceof Error ? error.message : String(error)
        }, 500);
    }
});

projects.openapi(createProjectRoute, async (c) => {
    const data = c.req.valid("json");
    try {
        const sql = postgres(c.env?.HYPERDRIVE?.connectionString);
        const project = await createProject(sql, data);
        return c.json({ data: project }, 201);
    } catch (error) {
        return c.json({
            error: 'Failed to create project',
            details: error instanceof Error ? error.message : String(error)
        }, 500);
    }
});

projects.openapi(updateProjectRoute, async (c) => {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");

    try {
        const sql = postgres(c.env?.HYPERDRIVE?.connectionString);
        const project = await updateProject(sql, Number(id), data);
        if (!project) {
            return c.json({
                error: 'Project not found',
                details: `Project with ID ${id} does not exist`
            }, 404);
        }
        return c.json({ data: project });
    } catch (error) {
        return c.json({
            error: 'Failed to update project',
            details: error instanceof Error ? error.message : String(error)
        }, 500);
    }
});

projects.openapi(deleteProjectRoute, async (c) => {
    const { id } = c.req.valid("param");

    try {
        const sql = postgres(c.env?.HYPERDRIVE?.connectionString);
        const project = await deleteProject(sql, Number(id));
        if (!project) {
            return c.json({
                error: 'Project not found',
                details: `Project with ID ${id} does not exist`
            }, 404);
        }
        return c.json({ data: project });
    } catch (error) {
        return c.json({
            error: 'Failed to delete project',
            details: error instanceof Error ? error.message : String(error)
        }, 500);
    }
});

export default projects;

import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { RouteConfig } from "@hono/zod-openapi";
import {
    SubmissionResponseSchema,
    SubmissionsResponseSchema,
    CreateSubmissionSchema,
    CreateSightingSchema,
    SightingSchema
} from "../schemas/submissions";
import {
    createSubmission,
    getSubmission,
    getSubmissionsByUser,
    deleteSubmission,
    createSighting
} from "../services/submissions";
import postgres from "postgres";
import type { CFEnv } from "../types";
import { z } from "@hono/zod-openapi";
import { supabaseAuthMiddleware } from "../middleware/supabaseAuth";

type SupabaseUser = {
    sub: string;
    email?: string;
    [key: string]: unknown;
};

const submissions = new OpenAPIHono<CFEnv>();

// Error response schema
const ErrorResponseSchema = z.object({
    error: z.string(),
    details: z.string(),
});

function formatResponse(
    submissions: any[],
    totalCount: number,
    params: { page: number; limit: number }
) {
    const totalPages = Math.ceil(totalCount / params.limit);

    return {
        data: submissions,
        pagination: {
            currentPage: params.page,
            totalPages,
            totalCount,
            hasNextPage: params.page < totalPages,
            hasPrevPage: params.page > 1,
        },
    };
}

const createSubmissionRoute = createRoute({
    method: "post",
    path: "/submissions",
    tags: ["Submissions"],
    summary: "Create a new submission",
    request: {
        body: {
            content: {
                "application/json": {
                    schema: CreateSubmissionSchema,
                },
            },
        },
    },
    responses: {
        201: {
            description: "Submission created",
            content: {
                "application/json": {
                    schema: SubmissionResponseSchema,
                },
            },
        },
        400: {
            description: "Invalid request",
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

submissions.use('/submissions', supabaseAuthMiddleware);
submissions.openapi(createSubmissionRoute, async (c) => {
    const user = c.get('user') as SupabaseUser;
    if (!user?.sub) {
        return c.json(
            { error: "Unauthorized", details: "User not authenticated" },
            401
        );
    }

    const submissionData = await c.req.json();
    const connectionString = c.env?.HYPERDRIVE?.connectionString;
    if (!connectionString) {
        return c.json(
            { error: "Configuration error", details: "Database connection not configured" },
            500
        );
    }
    const sql = postgres(connectionString);

    try {
        const result = await createSubmission(sql, submissionData, user.sub);
        return c.json({
            data: {
                ...result.submission,
                sightings: []
            }
        }, 201);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return c.json(
            {
                error: "Internal server error",
                details: errorMessage,
            },
            500
        );
    } finally {
        await sql.end();
    }
});

const getSubmissionRoute = createRoute({
    method: "get",
    path: "/submissions/{id}",
    tags: ["Submissions"],
    summary: "Get a submission by ID",
    request: {
        params: z.object({
            id: z.string().uuid(),
        }),
    },
    responses: {
        200: {
            description: "Submission details",
            content: {
                "application/json": {
                    schema: SubmissionResponseSchema,
                },
            },
        },
        404: {
            description: "Submission not found",
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

submissions.openapi(getSubmissionRoute, async (c) => {
    const { id } = c.req.valid("param");
    const connectionString = c.env?.HYPERDRIVE?.connectionString;
    if (!connectionString) {
        return c.json(
            { error: "Configuration error", details: "Database connection not configured" },
            500
        );
    }
    const sql = postgres(connectionString);

    try {
        const result = await getSubmission(sql, id);
        if (!result) {
            return c.json(
                { error: "Not found", details: "Submission not found" },
                404
            );
        }
        return c.json({
            data: {
                ...result.submission,
                sightings: result.sightings || []
            }
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return c.json(
            {
                error: "Internal server error",
                details: errorMessage,
            },
            500
        );
    } finally {
        await sql.end();
    }
});

const getUserSubmissionsRoute = createRoute({
    method: "get",
    path: "/submissions/user/{userId}",
    tags: ["Submissions"],
    summary: "Get submissions for a user",
    request: {
        params: z.object({
            userId: z.string(),
        }),
        query: z.object({
            page: z.number().default(1),
            limit: z.number().default(10),
        }),
    },
    responses: {
        200: {
            description: "User submissions",
            content: {
                "application/json": {
                    schema: SubmissionsResponseSchema,
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

submissions.openapi(getUserSubmissionsRoute, async (c) => {
    const { userId } = c.req.valid("param");
    const queryParams = c.req.valid("query");
    const connectionString = c.env?.HYPERDRIVE?.connectionString;
    if (!connectionString) {
        return c.json(
            { error: "Configuration error", details: "Database connection not configured" },
            500
        );
    }
    const sql = postgres(connectionString);

    try {
        const { submissions, totalCount } = await getSubmissionsByUser(
            sql,
            userId,
            queryParams
        );
        return c.json({
            data: submissions,
            pagination: {
                currentPage: queryParams.page,
                totalPages: Math.ceil(totalCount / queryParams.limit),
                totalCount,
                hasNextPage: queryParams.page < Math.ceil(totalCount / queryParams.limit),
                hasPrevPage: queryParams.page > 1
            }
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return c.json(
            {
                error: "Internal server error",
                details: errorMessage,
            },
            500
        );
    } finally {
        await sql.end();
    }
});

const deleteSubmissionRoute = createRoute({
    method: "delete",
    path: "/submissions/{id}",
    tags: ["Submissions"],
    summary: "Delete a submission",
    request: {
        params: z.object({
            id: z.string().uuid(),
        }),
    },
    responses: {
        204: {
            description: "Submission deleted",
        },
        404: {
            description: "Submission not found",
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

submissions.use('/submissions/*', supabaseAuthMiddleware);
submissions.openapi(deleteSubmissionRoute, async (c) => {
    const { id } = c.req.valid("param");
    const connectionString = c.env?.HYPERDRIVE?.connectionString;
    if (!connectionString) {
        return c.json(
            { error: "Configuration error", details: "Database connection not configured" },
            500
        );
    }
    const sql = postgres(connectionString);

    try {
        const deleted = await deleteSubmission(sql, id);
        if (!deleted) {
            return c.json(
                { error: "Not found", details: "Submission not found" },
                404
            );
        }
        return c.body(null, 204);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return c.json(
            {
                error: "Internal server error",
                details: errorMessage,
            },
            500
        );
    } finally {
        await sql.end();
    }
});

const createSightingRoute = createRoute({
    method: "post",
    path: "/submissions/{id}/sightings",
    tags: ["Submissions"],
    summary: "Add a sighting to a submission",
    request: {
        params: z.object({
            id: z.string().uuid(),
        }),
        body: {
            content: {
                "application/json": {
                    schema: CreateSightingSchema,
                },
            },
        },
    },
    responses: {
        201: {
            description: "Sighting created",
            content: {
                "application/json": {
                    schema: z.object({
                        data: SightingSchema,
                    }),
                },
            },
        },
        400: {
            description: "Invalid request",
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

submissions.use('/submissions/*/sightings', supabaseAuthMiddleware);
submissions.openapi(createSightingRoute, async (c) => {
    const { id } = c.req.valid("param");
    const sightingData = await c.req.json();
    const connectionString = c.env?.HYPERDRIVE?.connectionString;
    if (!connectionString) {
        return c.json(
            { error: "Configuration error", details: "Database connection not configured" },
            500
        );
    }
    const sql = postgres(connectionString);

    try {
        const result = await createSighting(sql, id, sightingData);
        return c.json({
            data: result.sighting
        }, 201);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return c.json(
            {
                error: "Internal server error",
                details: errorMessage,
            },
            500
        );
    } finally {
        await sql.end();
    }
});

export { submissions };

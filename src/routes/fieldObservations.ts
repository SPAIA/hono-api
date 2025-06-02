import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { RouteConfig } from "@hono/zod-openapi";
import {
    FieldObservationResponseSchema,
    FieldObservationsResponseSchema,
    CreateFieldObservationSchema,
    CreateSightingSchema,
    SightingSchema
} from "../schemas/fieldObservations";
import {
    createFieldObservation,
    getFieldObservation,
    getFieldObservationsByUser,
    deleteFieldObservation,
    createSighting
} from "../services/fieldObservations";
import postgres from "postgres";
import type { CFEnv } from "../types";
import { z } from "@hono/zod-openapi";
import { supabaseAuthMiddleware } from "../middleware/supabaseAuth";

type SupabaseUser = {
    sub: string;
    email?: string;
    [key: string]: unknown;
};

const fieldObservations = new OpenAPIHono<CFEnv>();

// Error response schema
const ErrorResponseSchema = z.object({
    error: z.string(),
    details: z.string(),
});

function formatResponse(
    observations: any[],
    totalCount: number,
    params: { page: number; limit: number }
) {
    const totalPages = Math.ceil(totalCount / params.limit);

    return {
        data: observations,
        pagination: {
            currentPage: params.page,
            totalPages,
            totalCount,
            hasNextPage: params.page < totalPages,
            hasPrevPage: params.page > 1,
        },
    };
}

// Create Field Observation
const createFieldObservationRoute = createRoute({
    method: "post",
    path: "/field-observations",
    tags: ["Field Observations"],
    summary: "Create a new field observation",
    request: {
        body: {
            content: {
                "application/json": {
                    schema: CreateFieldObservationSchema,
                },
            },
        },
    },
    responses: {
        201: {
            description: "Field observation created",
            content: {
                "application/json": {
                    schema: FieldObservationResponseSchema,
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

fieldObservations.use('/field-observations', supabaseAuthMiddleware);
fieldObservations.openapi(createFieldObservationRoute, async (c) => {
    const user = c.get('user') as SupabaseUser;
    if (!user?.sub) {
        return c.json(
            { error: "Unauthorized", details: "User not authenticated" },
            401
        );
    }

    const observationData = await c.req.json();
    const connectionString = c.env?.HYPERDRIVE?.connectionString;
    if (!connectionString) {
        return c.json(
            { error: "Configuration error", details: "Database connection not configured" },
            500
        );
    }
    const sql = postgres(connectionString);

    try {
        const { observation, sightings } = await createFieldObservation(sql, observationData, user.sub);
        return c.json({
            data: {
                ...observation,
                sightings: sightings || []
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

// Get Field Observation by ID
const getFieldObservationRoute = createRoute({
    method: "get",
    path: "/field-observations/{id}",
    tags: ["Field Observations"],
    summary: "Get a field observation by ID",
    request: {
        params: z.object({
            id: z.string().uuid(),
        }),
    },
    responses: {
        200: {
            description: "Field observation details",
            content: {
                "application/json": {
                    schema: FieldObservationResponseSchema,
                },
            },
        },
        404: {
            description: "Field observation not found",
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

fieldObservations.openapi(getFieldObservationRoute, async (c) => {
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
        const result = await getFieldObservation(sql, id);
        if (!result) {
            return c.json(
                { error: "Not found", details: "Field observation not found" },
                404
            );
        }
        return c.json({
            data: {
                ...result.observation,
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

// Get User's Field Observations
const getUserFieldObservationsRoute = createRoute({
    method: "get",
    path: "/field-observations/user/{userId}",
    tags: ["Field Observations"],
    summary: "Get field observations for a user",
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
            description: "User field observations",
            content: {
                "application/json": {
                    schema: FieldObservationsResponseSchema,
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

fieldObservations.openapi(getUserFieldObservationsRoute, async (c) => {
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
        const { observations, totalCount } = await getFieldObservationsByUser(
            sql,
            userId,
            queryParams
        );
        return c.json(formatResponse(observations, totalCount, queryParams));
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

// Delete Field Observation
const deleteFieldObservationRoute = createRoute({
    method: "delete",
    path: "/field-observations/{id}",
    tags: ["Field Observations"],
    summary: "Delete a field observation",
    request: {
        params: z.object({
            id: z.string().uuid(),
        }),
    },
    responses: {
        204: {
            description: "Field observation deleted",
        },
        404: {
            description: "Field observation not found",
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

fieldObservations.use('/field-observations/*', supabaseAuthMiddleware);
fieldObservations.openapi(deleteFieldObservationRoute, async (c) => {
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
        const deleted = await deleteFieldObservation(sql, id);
        if (!deleted) {
            return c.json(
                { error: "Not found", details: "Field observation not found" },
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

// Create Sighting
const createSightingRoute = createRoute({
    method: "post",
    path: "/field-observations/{id}/sightings",
    tags: ["Field Observations"],
    summary: "Add a sighting to a field observation",
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

fieldObservations.use('/field-observations/*/sightings', supabaseAuthMiddleware);
fieldObservations.openapi(createSightingRoute, async (c) => {
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

export default fieldObservations;
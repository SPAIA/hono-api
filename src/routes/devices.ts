import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { DeviceSchema, DevicesResponseSchema, DeviceQuerySchema, CreateDeviceSchema } from "../schemas/devices";
import postgres from "postgres";
import { fetchDeviceById, fetchDevices, insertDevice, deleteDevice } from "../services/devices";
import { CFEnv, SupabaseUser } from "../types";
import { QuerySchema } from "../schemas/validation";
import { supabaseAuthMiddleware } from "../middleware/supabaseAuth";

const route = new OpenAPIHono<CFEnv>();
route.use('/my/*', supabaseAuthMiddleware);

/**
 * GET /devices/{deviceId}
 * Fetch device information by its ID.
 */
const getDeviceRoute = createRoute<{ Env: CFEnv }, never>({
    method: "get",
    path: "/devices/{deviceId}",
    tags: ["devices"],
    summary: "Get device by ID",
    request: {
        params: z.object({
            deviceId: z.string().describe("Device unique identifier"),
        }),
    },
    responses: {
        200: {
            content: {
                "application/json": {
                    schema: DeviceSchema,
                },
            },
            description: "Device information retrieved successfully",
        },
        404: {
            content: {
                "application/json": {
                    schema: z.object({ message: z.string() }),
                },
            },
            description: "Device not found",
        },
        500: {
            content: {
                "application/json": {
                    schema: z.object({
                        message: z.string(),
                        error: z.string().optional(),
                    }),
                },
            },
            description: "Internal server error",
        },
    },
});

/**
 * Route Handler
 */
route.openapi(getDeviceRoute, async (c) => {
    const { deviceId } = c.req.valid("param");
    const sql = postgres(c.env?.HYPERDRIVE?.connectionString ?? '');

    try {
        const deviceData = await fetchDeviceById(sql, Number(deviceId));
        return c.json({ data: deviceData });
    } catch (error) {
        return c.json(
            {
                error: "Internal server error",
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            500
        );
    } finally {
        await sql.end();
    }
});

/**
 * GET /devices
 * Fetch a paginated list of devices with filtering and sorting options.
 */
const getDevicesRoute = createRoute<{ Env: CFEnv }>({
    method: "get",
    path: "/devices",
    tags: ["devices"],
    summary: "Get a list of devices with pagination, filtering, and sorting",
    request: {
        query: DeviceQuerySchema,
    },
    responses: {
        200: {
            description: "Devices retrieved successfully",
            content: {
                "application/json": {
                    schema: DevicesResponseSchema,
                },
            },
        },
        500: {
            description: "Internal Server Error",
            content: {
                "application/json": {
                    schema: z.object({
                        error: z.string(),
                        details: z.string(),
                    }),
                },
            },
        },
    },
});

/**
 * Route Handler
 */
route.openapi(getDevicesRoute, async (c) => {
    const queryParams = c.req.valid("query");
    const sql = postgres(c.env?.HYPERDRIVE?.connectionString ?? '');

    try {
        const devicesData = await fetchDevices(sql, queryParams);
        return c.json({
            devices: devicesData.devices,
            totalCount: devicesData.totalCount,
        });
    } catch (error: any) {
        console.error("Failed to fetch devices:", error);
        return c.json(
            {
                error: "Internal server error",
                details: error.message,
            },
            500
        );
    } finally {
        await sql.end();
    }
});

const getMyDevicesRoute = createRoute({
    method: "get",
    path: "/my/devices",
    tags: ["devices", "My"],
    summary: "Get a list of the users devices with pagination",
    request: {
        query: QuerySchema,
    },
    responses: {
        200: {
            description: "Devices retrieved successfully",
            content: {
                "application/json": {
                    schema: DevicesResponseSchema,
                },
            },
        },
        500: {
            description: "Internal Server Error",
            content: {
                "application/json": {
                    schema: z.object({
                        error: z.string(),
                        details: z.string(),
                    }),
                },
            },
        },
    },
});
route.openapi(getMyDevicesRoute, async (c) => {
    const queryParams = c.req.valid("query");
    const sql = postgres(c.env?.HYPERDRIVE?.connectionString ?? '');
    const user = c.get('user') as SupabaseUser;
    try {
        const devicesData = await fetchDevices(sql, { ...queryParams, user: user.sub });
        const totalPages = Math.ceil(devicesData.totalCount / queryParams.limit);
        return c.json({

            data: devicesData.devices,
            pagination: {
                currentPage: queryParams.page,
                totalPages,
                totalCount: devicesData.totalCount,
                hasNextPage: queryParams.page < totalPages,
                hasPrevPage: queryParams.page > 1,
            },
        });
    } catch (error: any) {
        console.error("Failed to fetch devices:", error);
        return c.json(
            {
                error: "Internal server error",
                details: error.message,
            },
            500
        );
    } finally {
        await sql.end();
    }
});
const createDeviceRoute = createRoute({
    method: "post",
    path: "/my/device",
    tags: ["devices", "My"],
    summary: "Create a new device",
    request: {
        body: {
            content: {
                "application/json": {
                    schema: CreateDeviceSchema,
                },
            },
        },
    },
    responses: {
        201: {
            description: "Device created successfully",
            content: {
                "application/json": {
                    schema: DeviceSchema,
                },
            },
        },
        400: {
            description: "Invalid request data",
            content: {
                "application/json": {
                    schema: z.object({
                        error: z.string(),
                        details: z.string().optional(),
                    }),
                },
            },
        },
        500: {
            description: "Internal Server Error",
            content: {
                "application/json": {
                    schema: z.object({
                        error: z.string(),
                        details: z.string(),
                    }),
                },
            },
        },
    },
});

route.openapi(createDeviceRoute, async (c) => {
    const deviceData = c.req.valid("json");
    const sql = postgres(c.env?.HYPERDRIVE?.connectionString ?? '');
    const user = c.get('user') as SupabaseUser;
    try {
        const device = {
            typeId: 1,
            name: deviceData.name ?? "Unknown Device", // Provide a fallback value
            serial: crypto.randomUUID(),
            notes: deviceData.notes ?? null,
            createdBy: user.sub,
        };
        const result = await insertDevice(sql, device);
        const newDevice = Array.isArray(result) ? result[0] : result;

        return c.json(newDevice, 201);
    } catch (error: any) {
        console.error("Failed to create device.... ", error);
        return c.json(
            {
                error: "Internal server error",
                details: error.message,
            },
            500
        );
    } finally {
        await sql.end();
    }
});


/**
 * DELETE /my/devices/{deviceId}
 * Delete a device by its ID (owner only)
 */
const deleteDeviceRoute = createRoute<{ Env: CFEnv }>({
    method: "delete",
    path: "/my/devices/{deviceId}",
    tags: ["devices", "My"],
    summary: "Delete a device by ID",
    request: {
        params: z.object({
            deviceId: z.string().describe("Device unique identifier"),
        }),
    },
    responses: {
        204: {
            description: "Device deleted successfully",
        },
        404: {
            content: {
                "application/json": {
                    schema: z.object({ message: z.string() }),
                },
            },
            description: "Device not found",
        },
        500: {
            content: {
                "application/json": {
                    schema: z.object({
                        error: z.string(),
                        details: z.string().optional(),
                    }),
                },
            },
            description: "Internal server error",
        },
    },
});

route.openapi(deleteDeviceRoute, async (c) => {
    const { deviceId } = c.req.valid("param");
    const sql = postgres(c.env?.HYPERDRIVE?.connectionString ?? '');
    const user = c.get('user') as SupabaseUser;

    try {
        // First verify device ownership
        const device = await fetchDeviceById(sql, Number(deviceId));
        if (!device?.device || device.device.createdBy !== user.sub) {
            return c.json({ message: "Device not found" }, 404);
        }

        await deleteDevice(sql, Number(deviceId), user.sub);
        return c.body(null, 204);
    } catch (error) {
        console.error("Failed to delete device:", error);
        return c.json(
            {
                error: "Internal server error",
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            500
        );
    } finally {
        await sql.end();
    }
});

/**
 * GET /devices/user/{userId}
 * Fetch devices for a specific user
 */
const getUserDevicesRoute = createRoute<{ Env: CFEnv }>({
    method: "get",
    path: "/devices/user/{userId}",
    tags: ["devices"],
    summary: "Get devices for a specific user",
    request: {
        params: z.object({
            userId: z.string().describe("User ID to fetch devices for"),
        }),
        query: QuerySchema,
    },
    responses: {
        200: {
            description: "Devices retrieved successfully",
            content: {
                "application/json": {
                    schema: DevicesResponseSchema,
                },
            },
        },
        403: {
            description: "Forbidden - insufficient permissions",
            content: {
                "application/json": {
                    schema: z.object({ message: z.string() }),
                },
            },
        },
        500: {
            description: "Internal Server Error",
            content: {
                "application/json": {
                    schema: z.object({
                        error: z.string(),
                        details: z.string(),
                    }),
                },
            },
        },
    },
});

route.openapi(getUserDevicesRoute, async (c) => {
    const { userId } = c.req.valid("param");
    const queryParams = c.req.valid("query");
    const sql = postgres(c.env?.HYPERDRIVE?.connectionString ?? '');
    try {
        const devicesData = await fetchDevices(sql, { ...queryParams, user: userId });
        const totalPages = Math.ceil(devicesData.totalCount / queryParams.limit);
        return c.json({
            data: devicesData.devices,
            pagination: {
                currentPage: queryParams.page,
                totalPages,
                totalCount: devicesData.totalCount,
                hasNextPage: queryParams.page < totalPages,
                hasPrevPage: queryParams.page > 1,
            },
        });
    } catch (error: any) {
        console.error("Failed to fetch user devices:", error);
        return c.json(
            {
                error: "Internal server error",
                details: error.message,
            },
            500
        );
    } finally {
        await sql.end();
    }
});

export default route;

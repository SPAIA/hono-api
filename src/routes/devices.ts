import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { DeviceSchema, DevicesResponseSchema, DeviceQuerySchema } from "../schemas/devices";
import postgres from "postgres";
import { fetchDeviceById, fetchDevices } from "../services/devices";

const route = new OpenAPIHono();

/**
 * GET /devices/{deviceId}
 * Fetch device information by its ID.
 */
const getDeviceRoute = createRoute({
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
    const sql = postgres(c.env.HYPERDRIVE.connectionString);

    try {
        const deviceData = await fetchDeviceById(sql, Number(deviceId));
        return c.json({ data: deviceData });
    } catch (error) {
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
 * GET /devices
 * Fetch a paginated list of devices with filtering and sorting options.
 */
const getDevicesRoute = createRoute({
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
    const sql = postgres(c.env.HYPERDRIVE.connectionString);

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

export default route;

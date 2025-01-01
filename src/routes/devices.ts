import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { DeviceSchema } from "../schemas/devices";
import postgres from "postgres";
import { fetchDeviceById } from "../services/devices";

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

export default route;

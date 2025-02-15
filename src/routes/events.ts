import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { EventResponseSchema, EventsResponseSchema } from "../schemas/events";
import { EventQuerySchema } from "../schemas/validation";
import { fetchEventById, fetchEvents } from "../services/events";
import { z } from "zod";
import postgres from "postgres";
import type { CFEnv } from "../types";

const events = new OpenAPIHono<CFEnv>();

// Update EventQuerySchema to include hasMedia
const ExtendedEventQuerySchema = EventQuerySchema.extend({
  hasMedia: z.enum(["true", "false"]).optional(),
});

function formatResponse(
  events: any[],
  totalCount: number,
  params: { page: number; limit: number }
) {
  const totalPages = Math.ceil(totalCount / params.limit);

  return {
    data: events,
    pagination: {
      currentPage: params.page,
      totalPages,
      totalCount,
      hasNextPage: params.page < totalPages,
      hasPrevPage: params.page > 1,
    },
  };
}

const getEventRoute = createRoute({
  method: "get",
  path: "/event/:eventId",
  tags: ["Events"],
  summary: "Get a single event",
  request: {
    params: z.object({
      eventId: z.string(),
    }),
  },
  responses: {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: EventResponseSchema,
        },
      },
    },
    500: {
      description: "Server error",
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

const getEventsRoute = createRoute({
  method: "get",
  path: "/events",
  tags: ["Events"],
  summary:
    "Get paginated events with regions and sensor data. Optionally filter by media presence.",
  request: {
    query: ExtendedEventQuerySchema,
  },
  responses: {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: EventsResponseSchema,
        },
      },
    },
    500: {
      description: "Server error",
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

events.openapi(getEventRoute, async (c) => {
  const { eventId } = c.req.valid("param");
  const sql = postgres(c.env?.HYPERDRIVE.connectionString);

  try {
    const { event } = await fetchEventById(sql, Number(eventId));
    return c.json({ data: event });
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

events.openapi(getEventsRoute, async (c) => {
  const params = c.req.valid("query");
  const sql = postgres(c.env.HYPERDRIVE.connectionString);

  try {
    // Convert string 'true'/'false' to boolean for hasMedia
    const processedParams = {
      ...params,
      hasMedia: params.hasMedia ? params.hasMedia === "true" : undefined,
    };

    const { events, totalCount } = await fetchEvents(sql, processedParams);
    return c.json(formatResponse(events, totalCount, processedParams));
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

const getDeviceEventsRoute = createRoute({
  method: "get",
  path: "/device/:deviceName",
  tags: ["Events"],
  request: {
    query: ExtendedEventQuerySchema,
    params: z.object({
      deviceName: z.string(),
    }),
  },
  responses: {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: EventsResponseSchema,
        },
      },
    },
    500: {
      description: "Server error",
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

events.openapi(getDeviceEventsRoute, async (c) => {
  const { deviceName } = c.req.valid("param");
  const queryParams = c.req.valid("query");
  const sql = postgres(c.env.HYPERDRIVE.connectionString);

  try {
    // Convert string 'true'/'false' to boolean for hasMedia

    const processedParams = {
      ...queryParams,
      deviceName,
      hasMedia: queryParams.hasMedia
        ? queryParams.hasMedia === "true"
        : undefined,
    };

    const { events, totalCount } = await fetchEvents(sql, processedParams);
    return c.json(formatResponse(events, totalCount, processedParams));
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


export { events, getEventsRoute, getDeviceEventsRoute };

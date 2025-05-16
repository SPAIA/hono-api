import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { RouteConfig } from "@hono/zod-openapi";
import { EventResponseSchema, EventsResponseSchema } from "../schemas/events";
import { EventQuerySchema } from "../schemas/validation";
import { fetchEventById, fetchEvents, deleteEvent } from "../services/events";
import postgres from "postgres";
import type { CFEnv } from "../types";
import { z } from "@hono/zod-openapi";

const events = new OpenAPIHono<CFEnv>();

// Error response schema
const ErrorResponseSchema = z.object({
  error: z.string(),
  details: z.string(),
});

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
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

events.openapi(getEventRoute, async (c) => {
  const { eventId } = c.req.valid("param");
  const sql = postgres(c.env?.HYPERDRIVE?.connectionString);

  try {
    const result = await fetchEventById(sql, Number(eventId));
    if (!result) {
      return c.json(
        { error: "Not found", details: "Event not found" },
        404
      );
    }
    return c.json({ data: result.event });
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

events.openapi(getEventsRoute, async (c) => {
  const params = c.req.valid("query");
  const sql = postgres(c.env?.HYPERDRIVE?.connectionString);

  try {
    const processedParams = {
      ...params,
      hasMedia: params.hasMedia ? params.hasMedia === "true" : undefined,
    };

    const { events, totalCount } = await fetchEvents(sql, processedParams);
    const response = formatResponse(events, totalCount, processedParams);
    return c.json(response);
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
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

events.openapi(getDeviceEventsRoute, async (c) => {
  const { deviceName } = c.req.valid("param");
  const queryParams = c.req.valid("query");
  const sql = postgres(c.env?.HYPERDRIVE?.connectionString);

  try {
    const processedParams = {
      ...queryParams,
      deviceName,
      hasMedia: queryParams.hasMedia ? queryParams.hasMedia === "true" : undefined,
    };

    const { events, totalCount } = await fetchEvents(sql, processedParams);
    const response = formatResponse(events, totalCount, processedParams);
    return c.json(response);
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

const getUserEventsRoute = createRoute({
  method: "get",
  path: "/events/user/{userId}",
  tags: ["Events"],
  summary: "Get events from all devices belonging to a user",
  request: {
    params: z.object({
      userId: z.string(),
    }),
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
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

events.openapi(getUserEventsRoute, async (c) => {
  const { userId } = c.req.valid("param");
  const queryParams = c.req.valid("query");
  const sql = postgres(c.env?.HYPERDRIVE?.connectionString);

  try {
    const processedParams = {
      ...queryParams,
      userId,
      hasMedia: queryParams.hasMedia ? queryParams.hasMedia === "true" : undefined,
    };

    const { events, totalCount } = await fetchEvents(sql, processedParams);
    const response = formatResponse(events, totalCount, processedParams);
    return c.json(response);
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

const deleteEventRoute = createRoute({
  method: "delete",
  path: "/events/{eventId}",
  tags: ["Events"],
  summary: "Delete an event by ID",
  request: {
    params: z.object({
      eventId: z.string().describe("Event unique identifier"),
    }),
  },
  responses: {
    204: {
      description: "Event deleted successfully",
    },
    404: {
      description: "Event not found",
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

events.openapi(deleteEventRoute, async (c) => {
  const { eventId } = c.req.valid("param");
  const sql = postgres(c.env?.HYPERDRIVE?.connectionString);

  try {
    const deleted = await deleteEvent(sql, Number(eventId));
    if (!deleted) {
      return c.json(
        { error: "Not found", details: "Event not found" },
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

export { events, getEventsRoute, getDeviceEventsRoute, getUserEventsRoute, deleteEventRoute };

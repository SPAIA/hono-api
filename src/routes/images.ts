import { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { CFEnv } from "../types";

const route = new OpenAPIHono();

const getImageRoute = createRoute({
  method: "get",
  path: "/images/uploads/{fileId}",
  tags: ["images"],
  summary: "Get image by file ID",
  request: {
    params: z.object({
      fileId: z.string().describe("Image file ID"),
    }),
  },
  responses: {
    200: {
      content: {
        "image/*": {
          schema: z.any().describe("Image file binary"),
        },
      },
      description: "Image file returned successfully",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
      description: "Image not found",
    },
  },
});

route.openapi(getImageRoute, async (c) => {
  const { fileId } = c.req.valid("param");
  const filename = "uploads/" + fileId;

  try {
    console.log("Env keys:", Object.keys(c.env));
    console.log("Looking for file:", filename);

    if (!c.env.BUCKET) {
      return c.json(
        {
          message: "Bucket not configured",
          debug: { env: Object.keys(c.env) },
        },
        500
      );
    }

    const obj = await c.env.BUCKET.get(filename);
    console.log("Object found:", !!obj);

    if (!obj) {
      return c.json(
        {
          message: "Image not found",
          debug: {
            filename,
            bucketExists: !!c.env.BUCKET,
            objKeys: obj ? Object.keys(obj) : null,
          },
        },
        404
      );
    }

    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set("etag", obj.httpEtag);
    headers.set("cache-control", "public, max-age=86400"); // Cache for 24 hours
    headers.set("cdn-cache-control", "max-age=604800"); // Cache at edge for 1 week

    return new Response(obj.body, { headers });
  } catch (err) {
    return c.json(
      {
        message: "Failed to fetch image",
        debug: {
          error: err.message,
          stack: err.stack,
          env: Object.keys(c.env),
        },
      },
      500
    );
  }
});

export default route;

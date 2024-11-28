// src/types.ts
import { Hyperdrive } from "@cloudflare/hyperdrive";
import { Queue } from "@cloudflare/workers-types";
import { R2Bucket } from "@cloudflare/workers-types";

export interface Env {
  MY_QUEUE: Queue;
  HYPERDRIVE: Hyperdrive;
  BUCKET: R2Bucket;
}

// src/index.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { prettyJSON } from "hono/pretty-json";
import { Env } from "./types";

const app = new Hono<{ Bindings: Env }>();

// Middleware - makes development a lot nicer
app.use("*", cors());
app.use("*", prettyJSON());

// Quick health check route
app.get("/", (c) =>
  c.json({
    status: "alive",
    timestamp: new Date().toISOString(),
  })
);

// Test route to verify your environment bindings
app.get("/test", async (c) => {
  return c.json({
    queue: !!c.env.MY_QUEUE,
    db: !!c.env.HYPERDRIVE,
    storage: !!c.env.BUCKET,
  });
});

export default app;

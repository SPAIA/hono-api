// src/types.ts
import { Queue } from "@cloudflare/workers-types";
import { R2Bucket } from "@cloudflare/workers-types";
import { OpenAPIHono } from "@hono/zod-openapi";

export interface Env {
  MY_QUEUE: Queue;
  HYPERDRIVE: Hyperdrive;
  BUCKET: R2Bucket;
}

// src/index.ts
import { cors } from "hono/cors";
import { prettyJSON } from "hono/pretty-json";
import { events } from "./routes/events";
import { swaggerUI } from "@hono/swagger-ui";

// const app = new Hono<{ Bindings: Env }>();
const app = new OpenAPIHono();

app.doc("/doc", {
  openapi: "3.0.0",
  info: {
    title: "Events API",
    version: "1.0.0",
  },
});

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

// app.route("/events", events);
app.route("/", events);
app.get("/ui", swaggerUI({ url: "/doc" }));

export default app;

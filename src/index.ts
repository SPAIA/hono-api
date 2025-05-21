// src/types.ts
import { Queue } from "@cloudflare/workers-types";
import { R2Bucket } from "@cloudflare/workers-types";
import { OpenAPIHono } from "@hono/zod-openapi";

// src/index.ts
import { cors } from "hono/cors";
import { prettyJSON } from "hono/pretty-json";
import { events } from "./routes/events";
import { swaggerUI } from "@hono/swagger-ui";
import { CFEnv } from "./types";
import imageRoutes from "./routes/images";
import deviceRoutes from "./routes/devices";
import myRoutes from "./routes/my";
import { submissions } from "./routes/submissions";

// const app = new Hono<{ Bindings: Env }>();
const app = new OpenAPIHono<CFEnv>();


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
app.route("/", imageRoutes);
app.route("/", deviceRoutes);
app.route("/", myRoutes);
app.route("/", submissions);
app.get("/ui", swaggerUI({ url: "/doc" }));

export default app;

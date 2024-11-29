// src/schemas/validation.ts
import { z } from "zod";

// Base pagination schema - your API's foundation
export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// Common sorting options - drop these into any route
export const SortSchema = z.object({
  sortBy: z.enum(["time", "type", "deviceId"]).default("time"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

// Combine them for a full-featured query schema
export const QuerySchema = PaginationSchema.merge(SortSchema);

// Add more common patterns as you build
export const DateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Combine schemas for specific routes
export const EventQuerySchema = QuerySchema.merge(DateRangeSchema);

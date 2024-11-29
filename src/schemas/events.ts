import { z } from "zod";

// Core schemas
const LocationSchema = z.string().nullable();
const TimestampSchema = z.coerce.date();
const NullableTimestampSchema = TimestampSchema.nullable();
const NullableStringSchema = z.string().nullable();

// Region schema
const RegionSchema = z.object({
  id: z.number(),
  eventId: z.number().nullable(),
  w: z.number().nullable(),
  h: z.number().nullable(),
  x: z.number().nullable(),
  y: z.number().nullable(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  labels: z.array(
    z.object({
      id: z.number(),
      name: NullableStringSchema,
      latinName: NullableStringSchema,
      count: z.number().nullable(),
      createdAt: TimestampSchema,
      updatedAt: TimestampSchema,
    })
  ),
});

// Sensor data schema
const SensorDataSchema = z.object({
  id: z.number(),
  sensorId: z.number().nullable(),
  eventId: z.number().nullable(),
  value: z.number().nullable(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  sensor: z
    .object({
      id: z.number(),
      name: NullableStringSchema,
      model: NullableStringSchema,
      typeId: z.number(),
      description: NullableStringSchema,
      createdAt: TimestampSchema,
      updatedAt: TimestampSchema,
    })
    .optional(),
});
const mediaDataSchema = z.object({
  id: z.number(),
  fileId: z.string(),
  source: z.string(),
});

// Main event schema
export const EventSchema = z.object({
  id: z.number(),
  time: NullableTimestampSchema,
  type: NullableStringSchema,
  deviceId: z.number(),
  location: LocationSchema,
  verifiedBy: NullableStringSchema,
  verifiedAt: NullableStringSchema,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  updatedBy: NullableStringSchema,
  regions: z.array(RegionSchema),
  sensorData: z.array(SensorDataSchema),
  media: z.array(mediaDataSchema),
});

// Pagination schema
export const PaginationSchema = z.object({
  currentPage: z.number(),
  totalPages: z.number(),
  totalCount: z.number(),
  hasNextPage: z.boolean(),
  hasPrevPage: z.boolean(),
});

// API response schema
export const EventsResponseSchema = z.object({
  data: z.array(EventSchema),
  pagination: PaginationSchema,
});
export const EventResponseSchema = z.object({
  data: EventSchema,
});

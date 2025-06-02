import { z } from "zod";

// Core schemas
const TimestampSchema = z.coerce.date();
const NullableStringSchema = z.string().nullable();

// Field Observation schema
export const FieldObservationSchema = z.object({
    id: z.string().uuid().optional(),
    user_id: z.string().uuid(),
    type: z.enum(['transect', 'fit']),
    time: z.coerce.date(), // Using timestamp with timezone
    location: z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180)
    }),
    weather: NullableStringSchema,
    temperature: z.number().int().optional(),
    wind: z.enum(['calm', 'light', 'moderate', 'strong']).nullable(),
    season: z.enum(['Spring', 'Summer', 'Autumn', 'Winter']).nullable(),
    consent: z.boolean().default(false),
    created_at: TimestampSchema
});

// Sighting schema
export const SightingSchema = z.object({
    id: z.number(),
    fieldObservationId: z.string().uuid(),
    group_name: z.string(),
    estimated_count: z.number().int().nonnegative(),
    behavior: NullableStringSchema,
    location_seen: NullableStringSchema,
    notes: NullableStringSchema,
    photo_url: NullableStringSchema,
    created_at: TimestampSchema
});

// API response schemas
export const FieldObservationResponseSchema = z.object({
    data: FieldObservationSchema.extend({
        sightings: z.array(SightingSchema)
    })
});

export const FieldObservationsResponseSchema = z.object({
    data: z.array(FieldObservationSchema),
    pagination: z.object({
        currentPage: z.number(),
        totalPages: z.number(),
        totalCount: z.number(),
        hasNextPage: z.boolean(),
        hasPrevPage: z.boolean()
    })
});

// Request schemas
export const CreateSightingSchema = SightingSchema.omit({
    id: true,
    created_at: true
}).extend({
    fieldObservationId: z.string().uuid().optional() // Optional for creation
});

export const CreateFieldObservationSchema = FieldObservationSchema.omit({
    created_at: true
}).extend({
    id: z.string().uuid().optional(),
    sightings: z.array(CreateSightingSchema.omit({
        fieldObservationId: true
    })).optional()
});

export const UpdateFieldObservationSchema = CreateFieldObservationSchema.partial();

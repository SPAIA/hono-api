import { z } from "zod";

// Core schemas
const TimestampSchema = z.coerce.date();
const NullableStringSchema = z.string().nullable();

// Submission schema
export const SubmissionSchema = z.object({
    id: z.string().uuid(),
    user_id: z.string(),
    type: z.enum(['transect', 'fit']),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
    location: NullableStringSchema,
    weather: NullableStringSchema,
    temperature: z.number().int().optional(),
    wind: NullableStringSchema,
    season: NullableStringSchema,
    consent: z.boolean().default(false),
    created_at: TimestampSchema
});

// Sighting schema
export const SightingSchema = z.object({
    id: z.number(),
    submission_id: z.string().uuid(),
    group_name: z.string(),
    estimated_count: z.number().int().nonnegative(),
    behavior: NullableStringSchema,
    location_seen: NullableStringSchema,
    notes: NullableStringSchema,
    photo_url: NullableStringSchema,
    created_at: TimestampSchema
});

// API response schemas
export const SubmissionResponseSchema = z.object({
    data: SubmissionSchema.extend({
        sightings: z.array(SightingSchema)
    })
});

export const SubmissionsResponseSchema = z.object({
    data: z.array(SubmissionSchema),
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
});

export const CreateSubmissionSchema = SubmissionSchema.omit({
    id: true,
    created_at: true
}).extend({
    sightings: z.array(CreateSightingSchema.omit({
        submission_id: true
    })).optional()
});

export const UpdateSubmissionSchema = CreateSubmissionSchema.partial();

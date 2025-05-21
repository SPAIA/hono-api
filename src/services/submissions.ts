import postgres from "postgres";
import { z } from "zod";
import {
    CreateSubmissionSchema,
    SubmissionSchema,
    SightingSchema,
    CreateSightingSchema
} from "../schemas/submissions";

async function createSubmission(
    sql: any,
    submissionData: z.infer<typeof CreateSubmissionSchema>,
    userId: string
) {
    try {
        const result = await sql`
      INSERT INTO submissions (
        user_id,
        type,
        date,
        time,
        location,
        weather,
        temperature,
        wind,
        season,
        consent
      ) VALUES (
        ${userId},
        ${submissionData.type},
        ${submissionData.date},
        ${submissionData.time},
        ${submissionData.location},
        ${submissionData.weather},
        ${submissionData.temperature},
        ${submissionData.wind},
        ${submissionData.season},
        ${submissionData.consent ?? false}
      ) RETURNING *
    `;

        return { submission: result[0] };
    } catch (error) {
        console.error("Error creating submission:", error);
        throw error;
    }
}

async function getSubmission(sql: any, id: string) {
    try {
        const [submission, sightings] = await Promise.all([
            sql`SELECT * FROM submissions WHERE id = ${id}`,
            sql`SELECT * FROM sightings WHERE submission_id = ${id}`
        ]);

        if (submission.length === 0) {
            return null;
        }

        return {
            submission: submission[0],
            sightings
        };
    } catch (error) {
        console.error("Error fetching submission:", error);
        throw error;
    }
}

async function getSubmissionsByUser(
    sql: any,
    userId: string,
    params: {
        page: number;
        limit: number;
    }
) {
    try {
        const offset = (params.page - 1) * params.limit;

        const [submissions, countResult] = await Promise.all([
            sql`
        SELECT * FROM submissions 
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT ${params.limit}
        OFFSET ${offset}
      `,
            sql`SELECT COUNT(*) FROM submissions WHERE user_id = ${userId}`
        ]);

        return {
            submissions,
            totalCount: parseInt(countResult[0].count)
        };
    } catch (error) {
        console.error("Error fetching user submissions:", error);
        throw error;
    }
}

async function deleteSubmission(sql: any, id: string) {
    try {
        // Delete related sightings first
        await sql`DELETE FROM sightings WHERE submission_id = ${id}`;

        // Then delete the submission
        const result = await sql`
      DELETE FROM submissions 
      WHERE id = ${id} 
      RETURNING id
    `;

        return result.length > 0;
    } catch (error) {
        console.error("Error deleting submission:", error);
        throw error;
    }
}

async function createSighting(
    sql: any,
    submissionId: string,
    sightingData: z.infer<typeof CreateSightingSchema>
) {
    try {
        const result = await sql`
      INSERT INTO sightings (
        submission_id,
        group_name,
        estimated_count,
        behavior,
        location_seen,
        notes,
        photo_url
      ) VALUES (
        ${submissionId},
        ${sightingData.group_name},
        ${sightingData.estimated_count},
        ${sightingData.behavior},
        ${sightingData.location_seen},
        ${sightingData.notes},
        ${sightingData.photo_url}
      ) RETURNING *
    `;

        return { sighting: result[0] };
    } catch (error) {
        console.error("Error creating sighting:", error);
        throw error;
    }
}

export {
    createSubmission,
    getSubmission,
    getSubmissionsByUser,
    deleteSubmission,
    createSighting
};

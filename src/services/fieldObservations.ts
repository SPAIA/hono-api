import postgres from "postgres";
import { z } from "zod";
import {
    CreateFieldObservationSchema,
    FieldObservationSchema,
    SightingSchema,
    CreateSightingSchema
} from "../schemas/fieldObservations";

async function createFieldObservation(
    sql: any,
    observationData: z.infer<typeof CreateFieldObservationSchema>,
    userId: string
) {
    try {
        const [observation, sightings] = await sql.begin(async sql => {
            // Insert observation first
            const [observation] = await sql`
                INSERT INTO "FieldObservations" (
                    user_id,
                    type,
                    time,
                    location,
                    weather,
                    temperature,
                    wind,
                    season,
                    consent
                ) VALUES (
                    ${userId},
                    ${observationData.type},
                    ${observationData.time},
                    ST_SetSRID(ST_MakePoint(
                        ${observationData.location.longitude}, 
                        ${observationData.location.latitude}
                    ), 4326)::GEOGRAPHY,
                    ${observationData.weather},
                    ${observationData.temperature},
                    ${observationData.wind},
                    ${observationData.season},
                    ${observationData.consent ?? false}
                ) RETURNING *
            `;

            // Insert sightings if provided
            const sightings = [];
            if (observationData.sightings && observationData.sightings.length > 0) {
                for (const sighting of observationData.sightings) {
                    const [s] = await sql`
                        INSERT INTO "Sightings" (
                            fieldObservationId,
                            group_name,
                            estimated_count,
                            behavior,
                            location_seen,
                            notes,
                            photo_url
                        ) VALUES (
                            ${observation.id},
                            ${sighting.group_name},
                            ${sighting.estimated_count},
                            ${sighting.behavior},
                            ${sighting.location_seen},
                            ${sighting.notes},
                            ${sighting.photo_url}
                        ) RETURNING *
                    `;
                    sightings.push(s);
                }
            }

            return [observation, sightings];
        });

        return { observation, sightings };
    } catch (error) {
        console.error("Error creating field observation:", error);
        throw error;
    }
}

async function getFieldObservation(sql: any, id: string) {
    try {
        const [observation, sightings] = await Promise.all([
            sql`SELECT * FROM "FieldObservations" WHERE id = ${id}`,
            sql`SELECT * FROM "Sightings" WHERE fieldObservationId = ${id}`
        ]);

        if (observation.length === 0) {
            return null;
        }

        return {
            observation: observation[0],
            sightings
        };
    } catch (error) {
        console.error("Error fetching field observation:", error);
        throw error;
    }
}

async function getFieldObservationsByUser(
    sql: any,
    userId: string,
    params: {
        page: number;
        limit: number;
    }
) {
    try {
        const offset = (params.page - 1) * params.limit;

        const [observations, countResult] = await Promise.all([
            sql`
                SELECT * FROM "FieldObservations"
                WHERE user_id = ${userId}
                ORDER BY created_at DESC
                LIMIT ${params.limit}
                OFFSET ${offset}
            `,
            sql`SELECT COUNT(*) FROM "FieldObservations" WHERE user_id = ${userId}`
        ]);

        return {
            observations,
            totalCount: parseInt(countResult[0].count)
        };
    } catch (error) {
        console.error("Error fetching user field observations:", error);
        throw error;
    }
}

async function deleteFieldObservation(sql: any, id: string) {
    try {
        // Delete related sightings first
        await sql`DELETE FROM "Sightings" WHERE fieldObservationId = ${id}`;

        // Then delete the observation
        const result = await sql`
            DELETE FROM "FieldObservations" 
            WHERE id = ${id} 
            RETURNING id
        `;

        return result.length > 0;
    } catch (error) {
        console.error("Error deleting field observation:", error);
        throw error;
    }
}

async function createSighting(
    sql: any,
    fieldObservationId: string,
    sightingData: z.infer<typeof CreateSightingSchema>
) {
    try {
        const result = await sql`
            INSERT INTO "Sightings" (
                fieldObservationId,
                group_name,
                estimated_count,
                behavior,
                location_seen,
                notes,
                photo_url
            ) VALUES (
                ${fieldObservationId},
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
    createFieldObservation,
    getFieldObservation,
    getFieldObservationsByUser,
    deleteFieldObservation,
    createSighting
};
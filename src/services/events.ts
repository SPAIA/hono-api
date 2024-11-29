async function fetchEvents(
  sql: any,
  params: {
    page: number;
    limit: number;
    sortBy: string;
    order: string;
    deviceId?: number;
    deviceName?: string;
    hasMedia?: boolean;
  }
) {
  console.log("Fetch events called with params:", params);

  const offset = (params.page - 1) * params.limit;

  // Build WHERE clause
  let whereClause = sql``;
  let conditions = [];

  if (params.deviceId) {
    conditions.push(sql`e."deviceId" = ${params.deviceId}`);
  } else if (params.deviceName) {
    conditions.push(sql`d."name" = ${params.deviceName}`);
  }

  // Add media and sensor data filter conditions
  if (params.hasMedia !== undefined) {
    if (params.hasMedia) {
      conditions.push(
        sql`EXISTS (SELECT 1 FROM "EventMedia" em WHERE em."eventId" = e.id)`
      );
    } else {
      conditions.push(
        sql`NOT EXISTS (SELECT 1 FROM "EventMedia" em WHERE em."eventId" = e.id)`
      );
      // For events without media, also ensure they have sensor data with value > 0
      conditions.push(sql`EXISTS (
        SELECT 1 
        FROM "SensorData" sd 
        WHERE sd."eventId" = e.id 
        AND sd.value > 0
      )`);
    }
  }

  // Combine conditions if they exist
  if (conditions.length > 0) {
    whereClause = sql`WHERE ${conditions[0]}`;
    for (let i = 1; i < conditions.length; i++) {
      whereClause = sql`${whereClause} AND ${conditions[i]}`;
    }
  }

  // Validate sort column and order
  const validSortColumns = [
    "time",
    "type",
    "deviceId",
    "createdAt",
    "updatedAt",
  ];
  const sortColumn = validSortColumns.includes(params.sortBy)
    ? params.sortBy
    : "time";
  // const sortOrder = params.order.toUpperCase() === "DESC" ? "DESC" : "ASC";

  const baseQuery = sql`
    SELECT 
      e.id,
      e.time,
      e.type,
      e."deviceId",
      d.name as "deviceName",
      ST_AsGeoJSON(e.location) as location,
      e."verifiedBy",
      e."verifiedAt",
      e."createdAt",
      e."updatedAt",
      e."updatedBy",
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', r.id,
              'w', r.w,
              'h', r.h,
              'x', r.x,
              'y', r.y
            )
          )
          FROM "Regions" r
          WHERE r."eventId" = e.id
        ),
        '[]'
      ) as regions,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', sd.id,
              'sensorId', sd."sensorId",
              'value', sd.value,
              'name', st.name
            )
          )
          FROM "SensorData" sd
          LEFT JOIN "Sensors" s ON sd."sensorId" = s.id
          LEFT JOIN "SensorTypes" st ON s."typeId" = st.id
          WHERE sd."eventId" = e.id
        ),
        '[]'
      ) as sensorData,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', em.id,
              'fileId', em."fileId",
              'source', em.source
            )
          )
          FROM "EventMedia" em 
          WHERE em."eventId" = e.id
        ),
        '[]'
      ) as media
    FROM "Events" e
    LEFT JOIN "Devices" d ON e."deviceId" = d.id
    ${whereClause}
    GROUP BY e.id, d.name
    ORDER BY e."time" DESC
    LIMIT ${params.limit}
    OFFSET ${offset}
  `;

  const countQuery = sql`
    SELECT COUNT(*) 
    FROM "Events" e
    LEFT JOIN "Devices" d ON e."deviceId" = d.id
    ${whereClause}
  `;

  try {
    const [countResult, events] = await Promise.all([countQuery, baseQuery]);
    console.log(
      "Queries completed. Count:",
      countResult[0].count,
      "Events:",
      events.length
    );
    return {
      events,
      totalCount: parseInt(countResult[0].count),
    };
  } catch (error) {
    console.error("Error in fetchEvents:", error);
    throw error;
  }
}

async function fetchEventById(sql: any, id: number) {
  try {
    const result = await sql`
      SELECT 
        e.id,
        e.time,
        e.type,
        e."deviceId",
        d.name as "deviceName",
        ST_AsGeoJSON(e.location) as location,
        e."verifiedBy",
        e."verifiedAt",
        e."createdAt",
        e."updatedAt",
        e."updatedBy",
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', r.id,
                'w', r.w,
                'h', r.h,
                'x', r.x,
                'y', r.y
              )
            )
            FROM "Regions" r
            WHERE r."eventId" = e.id
          ),
          '[]'
        ) as regions,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', sd.id,
                'sensorId', sd."sensorId",
                'value', sd.value,
                'name', st.name
              )
            )
            FROM "SensorData" sd
            LEFT JOIN "Sensors" s ON sd."sensorId" = s.id
            LEFT JOIN "SensorTypes" st ON s."typeId" = st.id
            WHERE sd."eventId" = e.id
          ),
          '[]'
        ) as sensorData,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', em.id,
                'fileId', em."fileId",
                'source', em.source
              )
            )
            FROM "EventMedia" em 
            WHERE em."eventId" = e.id
          ),
          '[]'
        ) as media
      FROM "Events" e
      LEFT JOIN "Devices" d ON e."deviceId" = d.id
      WHERE e.id = ${id}
      GROUP BY e.id, d.name
    `;

    if (result.length === 0) {
      return null;
    }
    return { event: result[0] };
  } catch (error) {
    console.error("Error in fetchEventById:", error);
    throw error;
  }
}

export { fetchEvents, fetchEventById };

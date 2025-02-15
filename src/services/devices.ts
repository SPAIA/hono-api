async function fetchDeviceById(sql: any, id: number) {
  try {
    const result = await sql`
      SELECT 
        d.id,
        d."typeId",
        d.name,
        d.serial,
        d.notes,
        d."updatedBy",
        d."createdAt",
        d."createdBy",
        d."updatedAt",
        d.ip,
        d."lastSeen",
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', s.id,
                'type', st.name,
                'lastUpdated', s."updatedAt"
              )
            )
            FROM "DeviceType_Sensors" ds
            LEFT JOIN "Sensors" s on ds."sensorId" = s.id
            LEFT JOIN "SensorTypes" st ON s."typeId" = st.id
            WHERE ds."deviceTypeId" = st.id
          ),
          '[]'
        ) as sensors
      FROM "Devices" d
      WHERE d.id = ${id}
      GROUP BY d.id
    `;

    if (result.length === 0) {
      return null;
    }
    return { device: result[0] };
  } catch (error) {
    console.error("Error in fetchDeviceById:", error);
    throw error;
  }
}
async function fetchDevices(
  sql: any,
  params: {
    page: number;
    limit: number;
    sortBy: string;
    order: string;
    user?: string;
    name?: string;
    typeId?: number;
  }
) {
  console.log("Fetch devices called with params:", params);

  const offset = (params.page - 1) * params.limit;

  // Build WHERE clause
  let whereClause = sql``;
  let conditions = [];

  // Filter by user
  if (params.user) {
    conditions.push(
      sql`EXISTS (
        SELECT 1 
        FROM "UserDevices" ud 
        WHERE ud."deviceId" = d.id 
        AND ud."user" = ${params.user}
      )`
    );
  }

  // Filter by device name
  if (params.name) {
    conditions.push(sql`d.name ILIKE ${'%' + params.name + '%'}`);
  }

  // Filter by typeId
  if (params.typeId) {
    conditions.push(sql`d."typeId" = ${params.typeId}`);
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
    "name",
    "typeId",
    "createdAt",
    "updatedAt",
    "lastSeen",
  ];
  const sortColumn = validSortColumns.includes(params.sortBy)
    ? params.sortBy
    : "createdAt";
  const sortOrder = params.order.toUpperCase() === "DESC" ? "DESC" : "ASC";

  // Base Query
  const baseQuery = sql`
    SELECT 
      d.id,
      d."typeId",
      d.name,
      d.serial,
      d.notes,
      d."updatedBy",
      d."createdAt",
      d."createdBy",
      d."updatedAt",
      d.ip,
      d."lastSeen",
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', s.id,
              'type', st.name,
              'lastUpdated', s."updatedAt"
            )
          )
          FROM "DeviceType_Sensors" ds
          LEFT JOIN "Sensors" s on ds."sensorId" = s.id
          LEFT JOIN "SensorTypes" st ON s."typeId" = st.id
          WHERE ds."deviceTypeId" = d."typeId"
        ),
        '[]'
      ) as sensors
    FROM "Devices" d
    ${whereClause}
    GROUP BY d.id
    LIMIT ${params.limit}
    OFFSET ${offset}
  `;

  // Count Query
  const countQuery = sql`
    SELECT COUNT(*) 
    FROM "Devices" d
    ${whereClause}
  `;

  try {
    const [countResult, devices] = await Promise.all([countQuery, baseQuery]);
    console.log(
      "Queries completed. Count:",
      countResult[0].count,
      "Devices:",
      devices.length
    );
    return {
      devices,
      totalCount: parseInt(countResult[0].count),
    };
  } catch (error) {
    console.error("Error in fetchDevices:", error);
    throw error;
  }
}
async function insertDevice(
  sql: any,
  device: {
    typeId: number;
    name: string;
    serial?: string | null;
    notes?: string | null;
    createdBy: string;
    ip?: string | null;
  }
) {
  try {
    console.log("device", device)
    // Start a transaction to ensure both inserts succeed together
    await sql.begin(async (tx) => {
      // Insert into Devices table
      const [newDevice] = await tx`
                INSERT INTO "Devices" (
                    "typeId",
                    name,
                    serial,
                    notes,
                    "createdBy",
                    ip,
                    "createdAt",
                    "updatedAt"
                ) VALUES (
                    ${device.typeId},
                    ${device.name},
                    ${device.serial || null},
                    ${device.notes || null},
                    ${device.createdBy},
                    ${device.ip || null},
                    NOW(),
                    NOW()
                )
                RETURNING 
                    id, "typeId", name, serial, notes, "createdBy", ip, "createdAt", "updatedAt";
            `;

      // Insert into UserDevices table
      await tx`
                INSERT INTO "UserDevices" (
                    "deviceId",
                    "user",
                    "createdAt",
                    "updatedAt"
                ) VALUES (
                    ${newDevice.id},
                    ${device.createdBy},
                    NOW(),
                    NOW()
                );
            `;

      return newDevice;
    });
  } catch (error) {
    console.error("Error in insertDevice:", error);
    throw error;
  }
}


export { fetchDeviceById, fetchDevices, insertDevice }
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
                'value', sd.value,
                'lastUpdated', sd."updatedAt"
              )
            )
            FROM "Sensors" s
            LEFT JOIN "SensorTypes" st ON s."typeId" = st.id
            LEFT JOIN "SensorData" sd ON s.id = sd."sensorId"
            WHERE s."deviceId" = d.id
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

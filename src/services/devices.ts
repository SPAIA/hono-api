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
export { fetchDeviceById }
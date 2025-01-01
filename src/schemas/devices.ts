import { z } from "zod";

export const DeviceSchema = z.object({
  id: z.number().int().describe("Unique identifier for the device"),
  typeId: z.number().int().nullable().describe("Type ID of the device"),
  name: z.string().nullable().describe("Name of the device"),
  serial: z.string().nullable().describe("Serial number of the device"),
  notes: z.string().nullable().describe("Additional notes about the device"),
  updatedBy: z.string().nullable().describe("User who last updated the device"),
  createdAt: z
    .string()
    .datetime()
    .nullable()
    .describe("Timestamp when the device was created"),
  createdBy: z.string().describe("User who created the device"),
  updatedAt: z
    .string()
    .datetime()
    .describe("Timestamp when the device was last updated"),
  ip: z.string().ip().nullable().describe("IP address of the device"),
  lastSeen: z
    .string()
    .datetime()
    .nullable()
    .describe("Timestamp when the device was last seen"),
});

// Export TypeScript type derived from schema
export type Device = z.infer<typeof DeviceSchema>;


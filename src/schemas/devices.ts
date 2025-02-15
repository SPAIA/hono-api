import { z } from "zod";
import { QuerySchema } from "./validation";

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
export const CreateDeviceSchema = z.object({
  typeId: z.number().int().nullable().describe("Type ID of the device"),
  name: z.string().nullable().describe("Name of the device"),
  serial: z.string().nullable().describe("Serial number of the device"),
  notes: z.string().nullable().describe("Additional notes about the device"),
});

// Export TypeScript type derived from schema
export type Device = z.infer<typeof DeviceSchema>;

/**
 * Response Schema for Paginated Devices
 */
export const DevicesResponseSchema = z.object({
  devices: z.array(DeviceSchema).describe("List of devices"),
  totalCount: z.number().describe("Total number of devices matching criteria"),
});

export const DeviceQuerySchema = QuerySchema.merge(z.object({
  user: z.string().optional().describe("Filter devices by user"),
  name: z.string().optional().describe("Filter devices by name"),
  typeId: z.number().optional().describe("Filter devices by type ID"),
}));


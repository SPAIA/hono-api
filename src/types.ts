import { R2Bucket, Hyperdrive } from "@cloudflare/workers-types";
import type { Env as HonoEnv } from "hono";

export interface CFEnv extends HonoEnv {
  HYPERDRIVE: Hyperdrive;
  BUCKET: R2Bucket;
}
export interface Sensor {
  id: number;
  name: string | null;
  model: string | null;
  typeId: number;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Sensor reading data
export interface SensorData {
  id: number;
  sensorId: number | null;
  eventId: number | null;
  value: number | null;
  createdAt: Date;
  updatedAt: Date;
  sensor?: Sensor; // Optional joined sensor details
}

export interface Label {
  id: number;
  name: string | null;
  latinName: string | null;
  count: number | null;
  createdAt: Date;
  updatedAt: Date;
  labels: Label[];
}
export interface Region {
  id: number;
  eventId: number | null;
  w: number | null;
  h: number | null;
  x: number | null;
  y: number | null;
  createdAt: Date;
  updatedAt: Date;
}
export interface Media {
  id: number;
  fileId: string;
  source?: string;
}
// Add your data types here too - keeps everything clean
export interface Event {
  id: number;
  time: Date | null;
  type: string | null;
  deviceId: number;
  location: string | null; // We'll handle the geometry type as a string for now
  verifiedBy: string | null;
  verifiedAt: string | null;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string | null;
  regions: Region[];
  sensorData: SensorData[];
  media: Media[];
}

export interface Device {
  id: number;
  typeId: number | null;
  name: string | null;
  serial: string | null;
  notes: string | null;
  updatedBy: string | null;
  createdAt: Date | null;
  createdBy: string;
  updatedAt: Date;
  ip: string | null;
  lastSeen: Date | null;
}

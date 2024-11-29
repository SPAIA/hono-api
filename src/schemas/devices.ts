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

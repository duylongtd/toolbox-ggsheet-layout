import type { AuditLogEntry } from "@/types";

export interface RecordAuditInput {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata?: Record<string, unknown>;
  ipHash?: string | null;
}

/** Audit metadata must never contain raw dataset values. */
export interface AuditLogRepository {
  record(input: RecordAuditInput): Promise<void>;
  listRecent(actorId: string, limit: number): Promise<AuditLogEntry[]>;
}

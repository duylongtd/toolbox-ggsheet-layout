import type { Job, JobStatus, StructuredError } from "@/types";

export interface CreateJobInput {
  analysisRequestId: string;
  type: Job["type"];
  payload: Record<string, unknown>;
  maxAttempts?: number;
}

export interface JobRepository {
  create(input: CreateJobInput): Promise<Job>;
  findById(id: string): Promise<Job | null>;
  findLatestByRequest(analysisRequestId: string): Promise<Job | null>;
  /** Atomically moves the next queued job to RUNNING. Returns null when idle. */
  claimNext(): Promise<Job | null>;
  update(
    id: string,
    changes: Partial<Pick<Job, "status" | "error" | "startedAt" | "finishedAt" | "attempts">>,
  ): Promise<Job>;
  cancelForRequest(analysisRequestId: string): Promise<void>;
}

export type { Job, JobStatus, StructuredError };

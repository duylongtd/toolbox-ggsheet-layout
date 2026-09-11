import "server-only";
import { serverEnv } from "@/server/infrastructure/config/env";
import { getRepositories } from "@/server/infrastructure/database";
import { logger } from "@/server/infrastructure/logging/logger";
import { sharedState } from "@/server/infrastructure/singleton";
import { AppError } from "@/server/http/errors";
import { AuditActions, createAuditService } from "./auditService";
import { createPipelineService } from "./pipelineService";

/**
 * Background job worker.
 *
 * The browser never waits for the analysis. The worker polls the job queue
 * through the `JobRepository`, so replacing it with Redis and a dedicated
 * worker process is a matter of providing another implementation of that
 * interface plus a separate entry point. On a serverless deployment this
 * in-process worker must be disabled (`JOB_WORKER_ENABLED=false`) and replaced
 * by an external runner.
 */

interface WorkerState {
  running: boolean;
  timer: NodeJS.Timeout | null;
}

/** Shared so route module duplication cannot start several workers. */
const state = (): WorkerState =>
  sharedState<WorkerState>("jobWorker", () => ({ running: false, timer: null }));

export function startJobWorker(): void {
  const worker = state();
  if (!serverEnv.JOB_WORKER_ENABLED || worker.timer) return;

  worker.timer = setInterval(() => {
    void drainQueue();
  }, serverEnv.JOB_POLL_INTERVAL_MS);
  // The interval must not keep a short lived process alive on its own.
  worker.timer.unref?.();

  logger.info("Job worker started", { intervalMs: serverEnv.JOB_POLL_INTERVAL_MS });
}

export function stopJobWorker(): void {
  const worker = state();
  if (worker.timer) {
    clearInterval(worker.timer);
    worker.timer = null;
  }
}

/** Processes queued jobs one at a time until the queue is empty. */
export async function drainQueue(): Promise<number> {
  const worker = state();
  if (worker.running) return 0;
  worker.running = true;
  let processed = 0;

  try {
    const repositories = getRepositories();
    const pipeline = createPipelineService(repositories);
    const audit = createAuditService(repositories);

    for (;;) {
      const job = await repositories.jobs.claimNext();
      if (!job) break;
      processed += 1;

      try {
        await pipeline.execute(job.analysisRequestId);
        await repositories.jobs.update(job.id, {
          status: "SUCCEEDED",
          finishedAt: new Date().toISOString(),
          error: null,
        });
      } catch (error) {
        const structured =
          AppError.is(error)
            ? { code: error.code, message: error.message, details: error.details }
            : {
                code: "ANALYSIS_FAILED",
                message: "The analysis could not be completed.",
                details: {},
              };

        logger.error("Analysis job failed", {
          jobId: job.id,
          analysisRequestId: job.analysisRequestId,
          code: structured.code,
        });

        await repositories.jobs.update(job.id, {
          status: "FAILED",
          finishedAt: new Date().toISOString(),
          error: structured,
        });
        await repositories.analysisRequests.update(job.analysisRequestId, {
          status: "FAILED",
          error: structured,
        });
        await audit.record({
          actorId: null,
          action: AuditActions.ANALYSIS_FAILED,
          entityType: "analysis_request",
          entityId: job.analysisRequestId,
          metadata: { code: structured.code },
        });
      }
    }
  } finally {
    worker.running = false;
  }

  return processed;
}

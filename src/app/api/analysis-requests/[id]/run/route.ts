import { route } from "@/server/http/route";
import { accepted } from "@/server/http/responses";
import { createAnalysisService } from "@/server/services/analysisService";
import { drainQueue } from "@/server/services/jobService";

export const runtime = "nodejs";

/**
 * Queues the pipeline and returns immediately.
 *
 * The queue is nudged without awaiting it, so the browser response is not tied
 * to the duration of the analysis.
 */
export const POST = route({ rateLimit: "run" }, async ({ user, params, repositories, requestId }) => {
  const service = createAnalysisService(repositories);
  const job = await service.run(String(params.id), user.id);
  void drainQueue();
  return accepted({ job }, requestId);
});

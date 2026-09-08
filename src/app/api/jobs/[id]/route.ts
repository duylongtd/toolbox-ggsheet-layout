import { forbidden, notFound } from "@/server/http/errors";
import { route } from "@/server/http/route";
import { ok } from "@/server/http/responses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Job status, used by the client to poll progress. */
export const GET = route({}, async ({ user, params, repositories, requestId }) => {
  const job = await repositories.jobs.findById(String(params.id));
  if (!job) throw notFound("This job no longer exists.");

  const request = await repositories.analysisRequests.findById(job.analysisRequestId);
  if (!request || request.ownerId !== user.id) {
    throw forbidden("You do not have access to this job.");
  }
  return ok({ job, status: request.status }, requestId);
});

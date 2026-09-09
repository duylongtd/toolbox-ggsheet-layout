import { z } from "zod";
import { route } from "@/server/http/route";
import { ok } from "@/server/http/responses";
import { createRefineService } from "@/server/services/refineService";

export const runtime = "nodejs";

/**
 * Deciding on a proposed change.
 *
 * The plan itself is never sent back by the browser, only the identifier of
 * the one it displayed. The definition that gets applied is the one the server
 * planned and checked against the data.
 */
const schema = z.object({
  planId: z.string().min(1).max(100),
  decision: z.enum(["APPROVE", "DISCARD"]),
});

export const POST = route(
  { bodySchema: schema, rateLimit: "run" },
  async ({ user, params, body, repositories, requestId }) => {
    const service = createRefineService(repositories);
    const input = {
      requestId: String(params.id),
      ownerId: user.id,
      planId: body.planId,
    };
    const outcome =
      body.decision === "APPROVE"
        ? await service.approvePlan(input)
        : await service.discardPlan(input);
    return ok(outcome, requestId);
  },
);

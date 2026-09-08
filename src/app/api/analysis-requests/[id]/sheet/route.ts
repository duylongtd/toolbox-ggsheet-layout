import { z } from "zod";
import { route } from "@/server/http/route";
import { ok } from "@/server/http/responses";
import { createAnalysisService } from "@/server/services/analysisService";

export const runtime = "nodejs";

const schema = z.object({ sheetIndex: z.number().int().min(0).max(200) });

/** Switches to another worksheet of the same upload. No re-upload is needed. */
export const POST = route(
  { bodySchema: schema },
  async ({ user, params, body, repositories, requestId }) => {
    const service = createAnalysisService(repositories);
    const result = await service.selectSheet({
      requestId: String(params.id),
      ownerId: user.id,
      sheetIndex: body.sheetIndex,
    });
    return ok(result, requestId);
  },
);

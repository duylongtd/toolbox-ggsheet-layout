import { z } from "zod";
import { route } from "@/server/http/route";
import { ok } from "@/server/http/responses";
import { CHART_TYPES, type Operation } from "@/server/services/refinement";
import { createRefineService } from "@/server/services/refineService";

export const runtime = "nodejs";

const chartType = z.enum(CHART_TYPES);

/**
 * Only these shapes are accepted. An instruction typed into `prompt` is
 * interpreted server side into this same closed set; it is never trusted to
 * describe an operation directly.
 */
const operationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("SET_CHART_ENABLED"), chartId: z.string().max(200), enabled: z.boolean() }),
  z.object({ type: z.literal("SET_CHART_TYPE"), chartId: z.string().max(200), chartType }),
  z.object({ type: z.literal("ADD_CHART"), chartType, column: z.string().max(200).optional() }),
  z.object({ type: z.literal("REMOVE_ALL_CHARTS") }),
  z.object({ type: z.literal("SET_REPORT_TITLE"), title: z.string().min(1).max(200) }),
  z.object({ type: z.literal("SET_REPORT_PERIOD"), period: z.string().max(200) }),
  z.object({ type: z.literal("SET_AI_ENABLED"), enabled: z.boolean() }),
  z.object({ type: z.literal("SET_GROUP_BY"), column: z.string().max(200) }),
  z.object({ type: z.literal("REMOVE_METRIC"), column: z.string().max(200) }),
  z.object({ type: z.literal("ADD_METRIC"), column: z.string().max(200), aggregation: z.enum(["sum", "mean"]) }),
]);

const schema = z
  .object({
    prompt: z.string().max(1000).optional(),
    operations: z.array(operationSchema).max(20).optional(),
  })
  .refine((value) => Boolean(value.prompt?.trim()) || Boolean(value.operations?.length), {
    message: "Cần có yêu cầu hoặc thao tác",
  });

export const POST = route(
  { bodySchema: schema, rateLimit: "run" },
  async ({ user, params, body, repositories, requestId }) => {
    const service = createRefineService(repositories);
    const outcome = body.prompt?.trim()
      ? await service.fromPrompt({
          requestId: String(params.id),
          ownerId: user.id,
          prompt: body.prompt,
        })
      : await service.fromOperations({
          requestId: String(params.id),
          ownerId: user.id,
          operations: body.operations as Operation[],
        });
    return ok(outcome, requestId);
  },
);

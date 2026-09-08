import "server-only";
import type { Repositories } from "@/server/repositories";
import { forbidden, notFound, validationFailed } from "@/server/http/errors";
import { applyOperations, type Operation } from "./refinement";
import { interpret } from "./prompt/intent";

/**
 * Changing a report after it has been produced.
 *
 * A typed sentence and a chart control both end up here, and both go through
 * the same closed operation set. A sentence never reaches the analysis engine
 * as anything other than one of those operations, so an instruction embedded in
 * it has nothing to act on.
 */
export interface RefineOutcome {
  status: "APPLIED" | "REFUSED" | "UNCLEAR";
  reply: string;
  changes: string[];
  examples?: string[];
}

export function createRefineService(repositories: Repositories) {
  return {
    /** Applies a free text request. Returns what was done, in Vietnamese. */
    async fromPrompt(input: {
      requestId: string;
      ownerId: string;
      prompt: string;
    }): Promise<RefineOutcome> {
      const request = await load(input.requestId, input.ownerId);
      if (!request.definition) {
        throw validationFailed("Báo cáo này chưa có cấu hình để chỉnh sửa.");
      }

      const outcome = interpret(input.prompt, request.definition);

      if (outcome.kind === "REFUSED") {
        return { status: "REFUSED", reply: outcome.reply, changes: [] };
      }
      if (outcome.kind === "UNCLEAR") {
        return {
          status: "UNCLEAR",
          reply: outcome.reply,
          changes: [],
          examples: outcome.examples,
        };
      }

      const applied = applyOperations(request.definition, outcome.operations);
      await repositories.analysisRequests.update(request.id, {
        definition: applied.definition,
      });

      return {
        status: "APPLIED",
        reply: applied.messages.join(" "),
        changes: applied.messages,
      };
    },

    /** Applies operations chosen through the interface rather than typed. */
    async fromOperations(input: {
      requestId: string;
      ownerId: string;
      operations: Operation[];
    }): Promise<RefineOutcome> {
      const request = await load(input.requestId, input.ownerId);
      if (!request.definition) {
        throw validationFailed("Báo cáo này chưa có cấu hình để chỉnh sửa.");
      }

      const applied = applyOperations(request.definition, input.operations);
      await repositories.analysisRequests.update(request.id, {
        definition: applied.definition,
      });

      return {
        status: "APPLIED",
        reply: applied.messages.join(" "),
        changes: applied.messages,
      };
    },
  };

  async function load(requestId: string, ownerId: string) {
    const request = await repositories.analysisRequests.findById(requestId);
    if (!request) throw notFound("Báo cáo này không còn nữa.");
    if (request.ownerId !== ownerId) throw forbidden("Bạn không có quyền với báo cáo này.");
    return request;
  }
}

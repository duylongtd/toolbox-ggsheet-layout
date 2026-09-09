import "server-only";
import { randomUUID } from "node:crypto";
import { getAnalysisEngineClient } from "@/server/infrastructure/python/client";
import type { Repositories } from "@/server/repositories";
import type { PendingPlan } from "@/types";
import { forbidden, notFound, validationFailed } from "@/server/http/errors";
import { describeChanges } from "./planDiff";
import { applyOperations, type Operation } from "./refinement";
import { checkPrompt } from "./prompt/guardrails";
import { interpret, type PromptContext } from "./prompt/intent";

/**
 * Changing a report after it has been produced.
 *
 * A typed sentence and a chart control both end up here, and both go through
 * the same closed operation set. A sentence never reaches the analysis engine
 * as anything other than one of those operations, so an instruction embedded in
 * it has nothing to act on.
 */
export interface RefineOutcome {
  status: "PROPOSED" | "APPLIED" | "REFUSED" | "UNCLEAR" | "INVALID" | "NO_MODEL";
  reply: string;
  changes: string[];
  examples?: string[];
  /** Why a stated requirement could not be answered from this data. */
  problems?: Array<{ code: string; message: string }>;
  /** Present on PROPOSED: the change waiting for a decision. */
  plan?: ProposedPlan;
}

/**
 * A plan as the interface shows it.
 *
 * The definition itself stays on the server. The browser only needs to render
 * the proposal and send back the identifier of the one it displayed, so a plan
 * cannot be replaced between being read and being accepted.
 */
export interface ProposedPlan {
  id: string;
  prompt: string;
  summary: string;
  steps: string[];
  notes: string[];
}

export function createRefineService(repositories: Repositories) {
  return {
    /**
     * Applies a free text request.
     *
     * Order matters, and it used to be wrong. The keyword rules ran first and
     * matched any sentence containing "them" and "bieu do", so a request that
     * named an indicator and a run of months collapsed into a generic "add a
     * chart" and the model was never asked. Anything a model can read is now
     * read by the model; the rules are what happens when there is no model.
     */
    async fromPrompt(input: {
      requestId: string;
      ownerId: string;
      prompt: string;
    }): Promise<RefineOutcome> {
      const request = await load(input.requestId, input.ownerId);
      if (!request.definition) {
        throw validationFailed("Báo cáo này chưa có cấu hình để chỉnh sửa.");
      }

      // Abuse and attempts to redirect the tool are settled here, so they never
      // reach a model at all.
      const verdict = checkPrompt(input.prompt);
      if (!verdict.allowed) {
        return { status: "REFUSED", reply: verdict.reply ?? "", changes: [] };
      }

      const planned = await this.fromRequirement(input, request);
      if (planned.status !== "NO_MODEL") return planned;

      // No model configured: fall back to the short commands the rules cover.
      const outcome = interpret(input.prompt, request.definition, await buildContext(request));

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

    /**
     * Plans a stated requirement, checks it against the data, then applies it.
     *
     * The model chooses what to compute. It never produces a figure, and a plan
     * naming a column or a value the sheet does not contain is refused with the
     * reason, rather than quietly answering a different question.
     */
    async fromRequirement(
      input: { requestId: string; ownerId: string; prompt: string },
      request: Awaited<ReturnType<typeof load>>,
    ): Promise<RefineOutcome> {
      if (!request.datasetId || !request.definition) {
        throw validationFailed("Báo cáo này chưa có dữ liệu để phân tích.");
      }

      const review = await getAnalysisEngineClient().planAnalysis({
        datasetId: request.datasetId,
        prompt: input.prompt,
        definition: request.definition,
        language: request.definition.report.language || "vi",
      });

      if (review.status === "VALID" && review.definition) {
        const steps = describeChanges(request.definition, review.definition);
        if (steps.length === 0) {
          return {
            status: "UNCLEAR",
            reply:
              "Báo cáo hiện tại đã đúng như yêu cầu này rồi, nên không có gì cần thay đổi.",
            changes: [],
            examples: suggestions(request.definition),
          };
        }

        const notes = review.problems.map((problem) => problem.message).filter(Boolean);
        const plan: PendingPlan = {
          id: randomUUID(),
          prompt: input.prompt,
          summary: review.summary || "Cập nhật báo cáo theo yêu cầu của bạn.",
          steps,
          notes,
          definition: review.definition,
          createdAt: new Date().toISOString(),
        };

        // Held, not applied. Nothing the model proposes changes the report
        // until the person reads the plan and accepts it.
        await repositories.analysisRequests.update(request.id, { pendingPlan: plan });

        return {
          status: "PROPOSED",
          reply: plan.summary,
          changes: steps,
          problems: review.problems.length ? review.problems : undefined,
          plan: {
            id: plan.id,
            prompt: plan.prompt,
            summary: plan.summary,
            steps: plan.steps,
            notes: plan.notes,
          },
        };
      }

      if (review.status === "IRRELEVANT") {
        return { status: "REFUSED", reply: review.summary, changes: [] };
      }

      if (review.status === "INVALID" || review.status === "UNSUPPORTED") {
        // A missing provider is a deployment fact, not a verdict on the
        // request, and the caller answers it differently.
        if (review.problems.some((problem) => problem.code === "AI_PROVIDER_NOT_CONFIGURED")) {
          return { status: "NO_MODEL", reply: "", changes: [] };
        }
        const reasons = review.problems.map((problem) => problem.message).filter(Boolean);
        return {
          status: "INVALID",
          reply:
            reasons[0] ??
            review.summary ??
            "Yêu cầu này không thực hiện được với bảng số liệu hiện có.",
          changes: [],
          problems: review.problems,
          examples: suggestions(request.definition),
        };
      }

      return {
        status: "UNCLEAR",
        reply: "Mình chưa rõ ý bạn. Bạn thử nói cụ thể hơn giúp mình.",
        changes: [],
        examples: suggestions(request.definition),
      };
    },

    /**
     * Applies a plan the owner accepted.
     *
     * The identifier has to match the plan that was shown. If a second request
     * replaced it in the meantime, the older proposal is refused rather than
     * silently applying a change nobody read.
     */
    async approvePlan(input: {
      requestId: string;
      ownerId: string;
      planId: string;
    }): Promise<RefineOutcome> {
      const request = await load(input.requestId, input.ownerId);
      const plan = request.pendingPlan;
      if (!plan || plan.id !== input.planId) {
        throw validationFailed("Phương án này không còn nữa. Bạn thử yêu cầu lại giúp mình.");
      }

      await repositories.analysisRequests.update(request.id, {
        definition: plan.definition,
        pendingPlan: null,
      });

      return {
        status: "APPLIED",
        reply: "Đã áp dụng phương án. Báo cáo đang được làm lại.",
        changes: plan.steps,
      };
    },

    /** Drops a plan the owner did not want. */
    async discardPlan(input: {
      requestId: string;
      ownerId: string;
      planId: string;
    }): Promise<RefineOutcome> {
      const request = await load(input.requestId, input.ownerId);
      if (request.pendingPlan && request.pendingPlan.id === input.planId) {
        await repositories.analysisRequests.update(request.id, { pendingPlan: null });
      }
      return {
        status: "REFUSED",
        reply: "Đã bỏ phương án. Báo cáo giữ nguyên như cũ.",
        changes: [],
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

  /** Ways of asking, written from this report rather than from a fixed list. */
  function suggestions(definition: import("@/types").TemplateDefinition | null): string[] {
    if (!definition) return [];
    const metric = definition.analysis.metrics[0]?.label;
    const group = definition.columns.find(
      (column) => column.key === definition.analysis.groupBy,
    )?.expectedName;
    return [
      metric ? `vẽ biểu đồ cột cho ${metric}` : "vẽ biểu đồ cột",
      group ? `so sánh các ${group} qua từng kỳ` : "so sánh qua từng kỳ",
      "đổi tên báo cáo thành Báo cáo quý 2",
    ];
  }

  /** Distinct values of the grouping column, taken from the last run. */
  async function buildContext(request: {
    id: string;
    datasetId: string | null;
    definition: import("@/types").TemplateDefinition | null;
  }): Promise<PromptContext> {
    const groupBy = request.definition?.analysis.groupBy;
    if (!groupBy) return {};

    const result = await repositories.analysisResults.findByRequestId(request.id);
    const fromSummary = (result?.groupSummary ?? [])
      .map((row) => (row as { group?: unknown }).group)
      .filter((value): value is string => typeof value === "string" && value.length > 0);
    if (fromSummary.length > 0) return { categories: fromSummary };

    // Before the first run there is no summary, so the preview rows stand in.
    if (!request.datasetId) return {};
    const dataset = await repositories.datasets.findById(request.datasetId);
    const values = (dataset?.sampleRows ?? [])
      .map((row) => row[groupBy])
      .filter((value): value is string => typeof value === "string" && value.length > 0);
    return { categories: Array.from(new Set(values)) };
  }

  async function load(requestId: string, ownerId: string) {
    const request = await repositories.analysisRequests.findById(requestId);
    if (!request) throw notFound("Báo cáo này không còn nữa.");
    if (request.ownerId !== ownerId) throw forbidden("Bạn không có quyền với báo cáo này.");
    return request;
  }
}

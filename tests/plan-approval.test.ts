import { describe, expect, it } from "vitest";
import { createMemoryRepositories } from "@/server/infrastructure/database/memory/repositories";
import { AppError } from "@/server/http/errors";
import { describeChanges } from "@/server/services/planDiff";
import { createRefineService } from "@/server/services/refineService";
import type { PendingPlan, TemplateDefinition } from "@/types";

/**
 * A plan is described from the two definitions rather than from what the model
 * says it did. These tests pin that the sentence a person approves is the
 * change that would actually be applied.
 */
function base(): TemplateDefinition {
  return {
    name: "x",
    description: "",
    category: "general",
    columns: [
      { key: "chi_tieu", expectedName: "Chỉ tiêu", aliases: [], type: "string", required: true, description: "" },
      { key: "thang_3", expectedName: "Tháng 3", aliases: [], type: "integer", required: true, description: "" },
      { key: "thang_4", expectedName: "Tháng 4", aliases: [], type: "integer", required: true, description: "" },
    ],
    cleaning: {},
    derivedFields: [],
    analysis: {
      groupBy: "chi_tieu",
      metrics: [{ key: "a", label: "Tháng 3", column: "thang_3", aggregation: "sum", unit: "" }],
      descriptiveColumns: [],
      rankings: [],
      outlierColumns: [],
      trendColumn: null,
    },
    charts: [{ id: "c1", type: "bar", title: "Theo tháng", x: "chi_tieu", y: "thang_3" }],
    report: { title: "Báo cáo quý 1", subtitle: "", period: "Quý 1", language: "vi", sections: [] },
    ai: { enabled: true, language: "vi", instructions: "", allowRawData: false },
  } as unknown as TemplateDefinition;
}

describe("describing a proposed change", () => {
  it("says nothing when nothing would change", () => {
    expect(describeChanges(base(), base())).toEqual([]);
  });

  it("names an added metric by the heading in the sheet", () => {
    const next = base();
    next.analysis.metrics.push({
      key: "b",
      label: "",
      column: "thang_4",
      aggregation: "sum",
      unit: "",
    });

    const steps = describeChanges(base(), next);
    expect(steps).toHaveLength(1);
    expect(steps[0]).toContain("Tháng 4");
    expect(steps[0]).toContain("tổng");
    // Internal keys are meaningless to the person approving the plan.
    expect(steps[0]).not.toContain("thang_4");
  });

  it("spells out which rows a filter keeps", () => {
    const next = base();
    next.analysis.filters = [
      { column: "chi_tieu", values: ["1. Tổng số PA"], mode: "include" },
    ];

    const steps = describeChanges(base(), next);
    expect(steps[0]).toContain("Chỉ lấy");
    expect(steps[0]).toContain("1. Tổng số PA");
  });

  it("reports a chart type change rather than a new chart", () => {
    const next = base();
    next.charts = [
      { id: "c1", type: "pie", title: "Theo tháng", x: "chi_tieu", y: "thang_3" },
    ] as TemplateDefinition["charts"];

    const steps = describeChanges(base(), next);
    expect(steps).toEqual(['Đổi "Theo tháng" sang dạng hình tròn']);
  });

  it("lists dropped charts before the new one, so the new one does not read as dropped too", () => {
    const before = base();
    before.charts = [
      { id: "c1", type: "bar", title: "A", x: "chi_tieu", y: "thang_3" },
      { id: "c2", type: "pie", title: "B", x: "chi_tieu", y: "thang_3" },
    ] as TemplateDefinition["charts"];
    const next = base();
    next.charts = [
      { id: "plan_bar_1", type: "bar", title: "Sáu tháng", x: "chi_tieu", y: null },
    ] as TemplateDefinition["charts"];

    const steps = describeChanges(before, next);
    expect(steps).toEqual(["Bỏ 2 biểu đồ đang có", "Vẽ Sáu tháng (cột đứng)"]);
  });

  it("does not hide a title change behind an analysis change", () => {
    const next = base();
    next.report.title = "Báo cáo quý 2";
    next.analysis.groupBy = null;

    const steps = describeChanges(base(), next);
    expect(steps).toContain('Đổi tên báo cáo thành "Báo cáo quý 2"');
    expect(steps).toContain("Bỏ cách nhóm số liệu");
  });
});

const OWNER = "00000000-0000-4000-8000-000000000001";
const OTHER = "00000000-0000-4000-8000-000000000002";

/** A request with a proposal already waiting on it. */
async function withPendingPlan() {
  const repositories = createMemoryRepositories();
  const request = await repositories.analysisRequests.create({
    ownerId: OWNER,
    title: "Báo cáo",
    sourceType: "excel",
    sourceName: "so-lieu.xlsx",
    templateId: null,
    templateVersionId: null,
    status: "COMPLETED",
  });

  const proposed = base();
  proposed.report.title = "Báo cáo quý 2";

  const plan: PendingPlan = {
    id: "plan-1",
    prompt: "đổi tên báo cáo thành Báo cáo quý 2",
    summary: "Đổi tên báo cáo.",
    steps: ['Đổi tên báo cáo thành "Báo cáo quý 2"'],
    notes: [],
    definition: proposed,
    createdAt: new Date().toISOString(),
  };

  await repositories.analysisRequests.update(request.id, {
    definition: base(),
    pendingPlan: plan,
  });

  return { repositories, requestId: request.id, plan };
}

describe("deciding on a proposal", () => {
  it("leaves the report untouched until the plan is accepted", async () => {
    const { repositories, requestId } = await withPendingPlan();

    const before = await repositories.analysisRequests.findById(requestId);
    expect(before?.definition?.report.title).toBe("Báo cáo quý 1");
    expect(before?.pendingPlan).not.toBeNull();
  });

  it("applies the reviewed definition on approval and clears the proposal", async () => {
    const { repositories, requestId, plan } = await withPendingPlan();
    const service = createRefineService(repositories);

    const outcome = await service.approvePlan({ requestId, ownerId: OWNER, planId: plan.id });
    expect(outcome.status).toBe("APPLIED");

    const after = await repositories.analysisRequests.findById(requestId);
    expect(after?.definition?.report.title).toBe("Báo cáo quý 2");
    expect(after?.pendingPlan).toBeNull();
  });

  it("keeps the report as it was when the proposal is discarded", async () => {
    const { repositories, requestId, plan } = await withPendingPlan();
    const service = createRefineService(repositories);

    await service.discardPlan({ requestId, ownerId: OWNER, planId: plan.id });

    const after = await repositories.analysisRequests.findById(requestId);
    expect(after?.definition?.report.title).toBe("Báo cáo quý 1");
    expect(after?.pendingPlan).toBeNull();
  });

  it("refuses a plan that has been replaced since it was shown", async () => {
    const { repositories, requestId } = await withPendingPlan();
    const service = createRefineService(repositories);

    // A second request replaced the proposal. Applying the one that was read
    // earlier would apply a change nobody approved.
    await expect(
      service.approvePlan({ requestId, ownerId: OWNER, planId: "plan-0" }),
    ).rejects.toBeInstanceOf(AppError);

    const after = await repositories.analysisRequests.findById(requestId);
    expect(after?.definition?.report.title).toBe("Báo cáo quý 1");
  });

  it("refuses a decision from someone else", async () => {
    const { repositories, requestId, plan } = await withPendingPlan();
    const service = createRefineService(repositories);

    await expect(
      service.approvePlan({ requestId, ownerId: OTHER, planId: plan.id }),
    ).rejects.toBeInstanceOf(AppError);
  });
});

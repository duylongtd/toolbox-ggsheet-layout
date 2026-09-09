import { describe, expect, it } from "vitest";
import { interpret } from "@/server/services/prompt/intent";
import type { TemplateDefinition } from "@/types";

/**
 * The keyword rules used to run first and swallow anything containing "them"
 * and "bieu do". A request naming an indicator and a run of months therefore
 * became a generic "add a chart" and the model was never asked.
 *
 * They still produce that generic operation, which is correct for what they
 * are; what changed is that they are no longer consulted first. These tests
 * pin the behaviour that made the ordering wrong, so the reason the ordering
 * exists stays visible.
 */
function definition(): TemplateDefinition {
  return {
    name: "x", description: "", category: "general",
    columns: [
      { key: "chi_tieu", expectedName: "Chỉ tiêu", aliases: [], type: "string", required: true, description: "" },
      { key: "thang_3", expectedName: "Tháng 3", aliases: [], type: "integer", required: true, description: "" },
      { key: "thang_8", expectedName: "Tháng 8", aliases: [], type: "integer", required: true, description: "" },
    ],
    cleaning: {}, derivedFields: [],
    analysis: {
      groupBy: "chi_tieu",
      metrics: [{ key: "a", label: "Tháng 3", column: "thang_3", aggregation: "sum", unit: "" }],
      descriptiveColumns: [], rankings: [], outlierColumns: [], trendColumn: null,
    },
    charts: [], report: { title: "x", subtitle: "", period: "", language: "vi", sections: [] },
    ai: { enabled: true, language: "vi", instructions: "", allowRawData: false },
  } as unknown as TemplateDefinition;
}

const CATEGORIES = ["1. Tổng số PA, góp ý đến hệ thống", "5. Cuộc gọi đến"];

describe("what the keyword rules can and cannot express", () => {
  it("loses the detail of a specified request, which is why they run second", () => {
    const outcome = interpret(
      "tôi muốn làm bảng chart cột về 1. Tổng số PA, góp ý đến hệ thống cho 6 tháng",
      definition(),
      { categories: CATEGORIES },
    );

    expect(outcome.kind).toBe("OPERATIONS");
    if (outcome.kind !== "OPERATIONS") return;

    const operation = outcome.operations[0] as { type: string; chartType?: string };
    expect(operation.type).toBe("ADD_CHART");
    // Neither the indicator nor the six months survives, so a model has to see
    // this sentence first.
    expect(JSON.stringify(outcome.operations)).not.toContain("Tổng số PA");
    expect(JSON.stringify(outcome.operations)).not.toContain("thang_8");
  });

  it("still answers the short commands it was written for", () => {
    for (const prompt of ["bỏ hết biểu đồ", "đổi tên báo cáo thành Quý 2"]) {
      expect(interpret(prompt, definition(), { categories: CATEGORIES }).kind, prompt).toBe(
        "OPERATIONS",
      );
    }
  });

  it("settles abuse without any model being involved", () => {
    expect(interpret("dm cham qua", definition(), { categories: CATEGORIES }).kind).toBe("REFUSED");
  });
});

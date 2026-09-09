import { describe, expect, it } from "vitest";
import { interpret } from "@/server/services/prompt/intent";
import { applyOperations } from "@/server/services/refinement";
import type { TemplateDefinition } from "@/types";

/** The shape of the sheet the problem was reported against. */
function definition(): TemplateDefinition {
  return {
    name: "Bao cao", description: "", category: "general",
    columns: [
      { key: "chi_tieu", expectedName: "Chỉ tiêu", aliases: [], type: "string", required: true, description: "" },
      { key: "thang_3", expectedName: "Tháng 3", aliases: [], type: "integer", required: true, description: "" },
      { key: "thang_4", expectedName: "Tháng 4", aliases: [], type: "integer", required: true, description: "" },
    ],
    cleaning: {}, derivedFields: [],
    analysis: {
      groupBy: "chi_tieu",
      metrics: [
        { key: "m3", label: "Tháng 3", column: "thang_3", aggregation: "sum", unit: "" },
        { key: "m4", label: "Tháng 4", column: "thang_4", aggregation: "sum", unit: "" },
      ],
      descriptiveColumns: ["thang_3", "thang_4"],
      rankings: [], outlierColumns: [], trendColumn: null,
    },
    charts: [], report: { title: "Bao cao", subtitle: "", period: "", language: "vi", sections: [] },
    ai: { enabled: true, language: "vi", instructions: "", allowRawData: false },
  } as unknown as TemplateDefinition;
}

const CATEGORIES = [
  "1. Tổng số PA, góp ý đến hệ thống",
  "2. Được phân phối tới cơ quan, đơn vị xử lý",
  "3. Không đủ điều kiện tiếp nhận",
  "5. Cuộc gọi đến",
  "6. Cuộc gọi đi",
];

describe("restricting the report to certain rows", () => {
  it("understands the sentence that was reported as not understood", () => {
    const outcome = interpret(
      "tôi muốn thống kê theo chỉ tiêu Tổng số PA, góp ý đến hệ thống thôi",
      definition(),
      { categories: CATEGORIES },
    );
    expect(outcome.kind).toBe("OPERATIONS");
    if (outcome.kind !== "OPERATIONS") return;
    expect(outcome.operations[0]).toEqual({
      type: "FILTER_ROWS",
      column: "chi_tieu",
      values: ["1. Tổng số PA, góp ý đến hệ thống"],
      mode: "include",
    });
  });

  it("accepts the shorter ways of saying it", () => {
    for (const prompt of [
      "chỉ lấy Tổng số PA thôi",
      "riêng Cuộc gọi đến",
      "chi xem cuoc goi di",
      "lọc Không đủ điều kiện tiếp nhận",
    ]) {
      const outcome = interpret(prompt, definition(), { categories: CATEGORIES });
      expect(outcome.kind, prompt).toBe("OPERATIONS");
    }
  });

  it("understands it written without diacritics", () => {
    const outcome = interpret("chi lay tong so pa gop y den he thong thoi", definition(), {
      categories: CATEGORIES,
    });
    expect(outcome.kind).toBe("OPERATIONS");
    if (outcome.kind !== "OPERATIONS") return;
    expect((outcome.operations[0] as { values: string[] }).values).toEqual([
      "1. Tổng số PA, góp ý đến hệ thống",
    ]);
  });

  it("drops rows when asked to remove one instead", () => {
    const outcome = interpret("bỏ Cuộc gọi đi ra khỏi báo cáo", definition(), {
      categories: CATEGORIES,
    });
    expect(outcome.kind).toBe("OPERATIONS");
    if (outcome.kind !== "OPERATIONS") return;
    expect(outcome.operations[0]).toMatchObject({ type: "FILTER_ROWS", mode: "exclude" });
  });

  it("clears the restriction again", () => {
    const outcome = interpret("bỏ lọc đi", definition(), { categories: CATEGORIES });
    expect(outcome.kind).toBe("OPERATIONS");
    if (outcome.kind !== "OPERATIONS") return;
    expect(outcome.operations).toContainEqual({ type: "CLEAR_FILTERS" });
  });

  it("stores the filter on the definition", () => {
    const result = applyOperations(definition(), [
      { type: "FILTER_ROWS", column: "chi_tieu", values: ["5. Cuộc gọi đến"], mode: "include" },
    ]);
    expect(result.definition.analysis.filters).toEqual([
      { column: "chi_tieu", values: ["5. Cuộc gọi đến"], mode: "include" },
    ]);
    expect(result.messages[0]).toContain("Cuộc gọi đến");
  });

  it("does not restrict when no category is named", () => {
    const outcome = interpret("chỉ thôi", definition(), { categories: CATEGORIES });
    expect(outcome.kind).toBe("UNCLEAR");
  });
});

describe("asking for clarification", () => {
  it("suggests examples built from this report, not a fixed list", () => {
    const outcome = interpret("báo cáo này thế nào rồi", definition(), { categories: CATEGORIES });
    expect(outcome.kind).toBe("UNCLEAR");
    if (outcome.kind !== "UNCLEAR") return;
    // The old reply offered "bo cot ghi chu", a column this sheet never had.
    expect(outcome.examples.join(" ")).toContain("Tổng số PA");
    expect(outcome.examples.join(" ")).toContain("Tháng 3");
    expect(outcome.examples.join(" ")).not.toContain("ghi chú");
  });
});

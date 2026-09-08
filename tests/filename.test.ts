import { describe, expect, it } from "vitest";
import { removeDiacritics, reportFileName, slugify } from "@/lib/format/filename";

describe("download file names", () => {
  it("transliterates Vietnamese instead of deleting it", () => {
    expect(removeDiacritics("Báo cáo xử lý hồ sơ quý 1")).toBe("Bao cao xu ly ho so quy 1");
    expect(removeDiacritics("Đơn vị Đã xử lý")).toBe("Don vi Da xu ly");
  });

  it("produces a readable slug where the old rule produced initials", () => {
    // The previous rule stripped every non ASCII byte and left "B_o_c_o_x_l_h_s_".
    expect(slugify("Báo cáo xử lý hồ sơ quý 1")).toBe("bao-cao-xu-ly-ho-so-quy-1");
  });

  it("keeps the name short and cuts on a word boundary", () => {
    const slug = slugify("Báo cáo tổng hợp tình hình xử lý hồ sơ hành chính của các đơn vị");
    expect(slug.length).toBeLessThanOrEqual(48);
    expect(slug.endsWith("-")).toBe(false);
    expect(slug.startsWith("bao-cao-tong-hop")).toBe(true);
  });

  it("appends the date so quarters do not overwrite each other", () => {
    const name = reportFileName("Báo cáo quý 1", "2026-09-08T04:13:00.000Z");
    expect(name).toBe("bao-cao-quy-1-20260908.pdf");
  });

  it("falls back when the title has nothing usable", () => {
    expect(reportFileName("###", "2026-09-08T00:00:00.000Z")).toBe("bao-cao-20260908.pdf");
  });

  it("contains only characters that are safe in a header", () => {
    const name = reportFileName('Báo cáo "quý 1"; rm -rf /', new Date("2026-01-02"));
    expect(name).toMatch(/^[a-z0-9-]+\.pdf$/);
  });
});

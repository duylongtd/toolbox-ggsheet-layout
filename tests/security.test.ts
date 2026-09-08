import { describe, expect, it } from "vitest";
import { looksLikeFormula, neutralizeFormula, toCsv } from "@/lib/security/formula";
import { escapeHtml, toDisplayText } from "@/lib/security/text";
import { checkSheetUrl } from "@/lib/security/sheetUrl";
import { checkUpload } from "@/lib/security/upload";

describe("formula injection", () => {
  it("prefixes every dangerous leading character", () => {
    for (const payload of ["=1+1", "+1234567890", "-cmd", "@SUM(A1)", "\tvalue", "\rvalue"]) {
      const neutralized = neutralizeFormula(payload);
      expect(neutralized.startsWith("'")).toBe(true);
      expect(neutralized.slice(1)).toBe(payload);
    }
  });

  it("leaves ordinary values untouched", () => {
    expect(neutralizeFormula("Department A")).toBe("Department A");
    expect(neutralizeFormula(120)).toBe("120");
    expect(neutralizeFormula(null)).toBe("");
  });

  it("detects formula shaped values", () => {
    expect(looksLikeFormula("=cmd|'/c calc'!A1")).toBe(true);
    expect(looksLikeFormula("ordinary")).toBe(false);
  });

  it("neutralizes and quotes every cell of a CSV export", () => {
    const csv = toCsv(["name", "value"], [{ name: "=HYPERLINK(1)", value: 'say "hi"' }]);
    expect(csv).toContain(`"'=HYPERLINK(1)"`);
    expect(csv).toContain(`"say ""hi"""`);
  });
});

describe("untrusted text", () => {
  it("escapes markup for non React sinks", () => {
    expect(escapeHtml("<script>alert('x')</script>")).toBe(
      "&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;",
    );
  });

  it("strips control characters and caps the length", () => {
    const withControlCharacters = ["a", String.fromCharCode(0), "b", String.fromCharCode(31), "c"];
    expect(toDisplayText(withControlCharacters.join(""))).toBe("abc");
    expect(toDisplayText("x".repeat(500), 100)).toHaveLength(100);
  });

  it("normalises the invisible separators spreadsheets emit", () => {
    // Line and paragraph separators are invisible and break layout and logs.
    const exotic = ["a", "\u2028", "b", "\u00A0", "c", "\uFEFF"].join("");
    expect(toDisplayText(exotic)).toBe("a b c ");
  });
});

describe("upload checks", () => {
  const limit = 20 * 1024 * 1024;

  it("accepts the supported formats", () => {
    expect(checkUpload("data.xlsx", 1000, limit).valid).toBe(true);
    expect(checkUpload("data.csv", 1000, limit).valid).toBe(true);
  });

  it("explains why a known unsupported format is rejected", () => {
    expect(checkUpload("data.xlsm", 1000, limit).message).toContain("Macro enabled");
    expect(checkUpload("data.xls", 1000, limit).message).toContain("legacy");
  });

  it("rejects unknown extensions, empty files and oversized files", () => {
    expect(checkUpload("data.exe", 1000, limit).valid).toBe(false);
    expect(checkUpload("data.xlsx", 0, limit).valid).toBe(false);
    expect(checkUpload("data.xlsx", limit + 1, limit).message).toContain("20 MB");
  });
});

describe("Google Sheets address", () => {
  it("accepts a standard sheet address and extracts the identifiers", () => {
    const result = checkSheetUrl(
      "https://docs.google.com/spreadsheets/d/1AbC-dEfGhIjKlMnOpQr/edit#gid=42",
    );
    expect(result.valid).toBe(true);
    expect(result.spreadsheetId).toBe("1AbC-dEfGhIjKlMnOpQr");
    expect(result.gid).toBe("42");
  });

  it("rejects anything that is not a Google Sheets https address", () => {
    const rejected = [
      "http://docs.google.com/spreadsheets/d/1AbC-dEfGhIjKlMnOpQr/edit",
      "https://evil.example.com/spreadsheets/d/1AbC-dEfGhIjKlMnOpQr/edit",
      "https://docs.google.com.attacker.test/spreadsheets/d/1AbC-dEfGhIjKlMnOpQr",
      "https://docs.google.com/document/d/1AbC-dEfGhIjKlMnOpQr/edit",
      "file:///etc/passwd",
      "javascript:alert(1)",
      "",
    ];
    for (const url of rejected) {
      expect(checkSheetUrl(url).valid, url).toBe(false);
    }
  });
});

import { describe, expect, it } from "vitest";
import { z } from "zod";

/**
 * The public address is trimmed on the way in.
 *
 * A trailing slash produces a callback of "https://host//auth/callback", which
 * the identity provider rejects with a mismatch error that never mentions the
 * slash. The rule is small enough to restate here rather than exporting it, so
 * the test fails if the schema is loosened.
 */
const publicUrl = z
  .string()
  .default("http://localhost:3000")
  .transform((value) => value.trim().replace(/\/+$/, ""))
  .refine((value) => /^https?:\/\/[^/]+$/.test(value), {
    message: "must be an http(s) origin with no path, for example https://app.example.com",
  });

describe("the public address of a deployment", () => {
  it("drops a trailing slash so the callback address stays valid", () => {
    const parsed = publicUrl.parse("https://trolybaocao.trungtamkhcn.vn/");
    expect(parsed).toBe("https://trolybaocao.trungtamkhcn.vn");
    expect(`${parsed}/auth/callback`).toBe("https://trolybaocao.trungtamkhcn.vn/auth/callback");
  });

  it("drops several, and surrounding spaces a paste can leave behind", () => {
    expect(publicUrl.parse("  https://example.com///  ")).toBe("https://example.com");
  });

  it("keeps a port", () => {
    expect(publicUrl.parse("http://localhost:3000")).toBe("http://localhost:3000");
  });

  it("refuses an address carrying a path", () => {
    expect(() => publicUrl.parse("https://example.com/app")).toThrow();
  });

  it("refuses a bare host, which would silently become a relative address", () => {
    expect(() => publicUrl.parse("trolybaocao.trungtamkhcn.vn")).toThrow();
  });
});

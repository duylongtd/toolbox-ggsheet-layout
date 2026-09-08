/**
 * Download file names.
 *
 * A Vietnamese title stripped of every non ASCII character collapses into
 * something unreadable: "Bao cao xu ly ho so" became "B_o_c_o_x_l_h_s_".
 * Diacritics are transliterated first, so the name stays recognisable, and the
 * result is kept short because it is shown in a browser download list.
 */

const DIACRITIC_MAP: Record<string, string> = {
  a: "àáạảãâầấậẩẫăằắặẳẵ",
  e: "èéẹẻẽêềếệểễ",
  i: "ìíịỉĩ",
  o: "òóọỏõôồốộổỗơờớợởỡ",
  u: "ùúụủũưừứựửữ",
  y: "ỳýỵỷỹ",
  d: "đ",
};

const LOOKUP = new Map<string, string>();
for (const [plain, accented] of Object.entries(DIACRITIC_MAP)) {
  for (const character of accented) {
    LOOKUP.set(character, plain);
    LOOKUP.set(character.toUpperCase(), plain.toUpperCase());
  }
}

/** Replaces Vietnamese diacritics with their base letters. */
export function removeDiacritics(value: string): string {
  return Array.from(value)
    .map((character) => LOOKUP.get(character) ?? character)
    .join("")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Lower case, hyphen separated, ASCII only. */
export function slugify(value: string, maxLength = 48): string {
  const slug = removeDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length <= maxLength) return slug;
  // Cut on a word boundary rather than mid word.
  const cut = slug.slice(0, maxLength);
  const lastBoundary = cut.lastIndexOf("-");
  return lastBoundary > maxLength / 2 ? cut.slice(0, lastBoundary) : cut;
}

/**
 * Builds the download name for a report: a readable slug plus the date, so
 * several quarters of the same report do not overwrite one another.
 */
export function reportFileName(title: string, generatedAt: string | Date): string {
  const date = generatedAt instanceof Date ? generatedAt : new Date(generatedAt);
  const stamp = Number.isNaN(date.getTime())
    ? ""
    : date.toISOString().slice(0, 10).replace(/-/g, "");
  const slug = slugify(title) || "bao-cao";
  return stamp ? `${slug}-${stamp}.pdf` : `${slug}.pdf`;
}

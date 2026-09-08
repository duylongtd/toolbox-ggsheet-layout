/**
 * Normalisation of what a person actually types.
 *
 * Staff write with no diacritics, with phone-keyboard shortcuts, with typing
 * slips, and in the Nghe An and Ha Tinh dialects. All of that has to reach the
 * same canonical form before any rule looks at it, otherwise the tool only
 * understands people who type carefully.
 */

const DIACRITICS: Record<string, string> = {
  a: "àáạảãâầấậẩẫăằắặẳẵ",
  e: "èéẹẻẽêềếệểễ",
  i: "ìíịỉĩ",
  o: "òóọỏõôồốộổỗơờớợởỡ",
  u: "ùúụủũưừứựửữ",
  y: "ỳýỵỷỹ",
  d: "đ",
};

const FOLD = new Map<string, string>();
for (const [plain, accented] of Object.entries(DIACRITICS)) {
  for (const character of accented) {
    FOLD.set(character, plain);
    FOLD.set(character.toUpperCase(), plain.toUpperCase());
  }
}

/**
 * Regional words, matched while the diacritics are still present.
 *
 * This pass has to run before folding, because folding destroys the very marks
 * that tell these words apart. "nỏ" means không, "nớ" means kia and "nó" means
 * it; all three fold to "no". Mapping after folding would rewrite the wrong one.
 *
 * Only words that help express a command are listed. Question words such as
 * "mô" and "răng" are left alone: they cannot instruct anything, and mapping
 * them risks damaging a column name that legitimately contains them.
 */
const DIALECT_WORDS: Array<[string, string]> = [
  ["nỏ", "không"],
  ["mần", "làm"],
  ["cấy", "cái"],
  ["rứa", "thế"],
  ["chộ", "thấy"],
  ["nớ", "kia"],
  ["tui", "tôi"],
  ["tau", "tôi"],
  ["ni", "này"],
  ["vô", "vào"],
];

/**
 * `\b` is defined over ASCII word characters, so it does not sit where it
 * should next to an accented letter: `/\bnỏ\b/` never matches. These
 * lookarounds test for a letter or digit in any script instead.
 */
const DIALECT: Array<[RegExp, string]> = DIALECT_WORDS.map(([word, replacement]) => [
  new RegExp(`(?<![\\p{L}\\p{N}])${word}(?![\\p{L}\\p{N}])`, "gu"),
  replacement,
]);

/**
 * Keyboard shorthand, matched after folding.
 *
 * Every entry here must be a form that ordinary Vietnamese does not produce.
 * "cho", "chi", "no", "te" and "mo" were deliberately removed from this list:
 * they collide with common words, and mapping them corrupted sentences such as
 * "cho tôi biểu đồ" and column names such as "Chi phí".
 */
const SHORTHAND: Record<string, string> = {
  ko: "khong",
  k: "khong",
  kg: "khong",
  khg: "khong",
  hok: "khong",
  hong: "khong",
  dc: "duoc",
  dk: "duoc",
  j: "gi",
  bc: "bao cao",
  bd: "bieu do",
  baocao: "bao cao",
  bieudo: "bieu do",
  ntn: "nhu the nao",
  sl: "so lieu",
  tl: "ty le",
  hs: "ho so",
};

/** Removes Vietnamese diacritics. */
export function fold(value: string): string {
  return Array.from(value)
    .map((character) => FOLD.get(character) ?? character)
    .join("")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Canonical form used by every rule: folded, lower case, punctuation reduced to
 * spaces, dialect and shorthand expanded, repeated letters collapsed.
 */
export function normalize(value: string): string {
  let text = String(value ?? "").toLowerCase();

  // Regional words first, while their diacritics still distinguish them.
  for (const [pattern, replacement] of DIALECT) {
    text = text.replace(pattern, replacement);
  }

  const folded = fold(text)
    // Keep letters, digits and spaces. Everything else becomes a separator.
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return folded
    .split(" ")
    .map((word) => {
      // A held key produces "khoongggg"; every run collapses to one letter.
      const collapsed = word.replace(/(.)\1+/g, "$1");
      return SHORTHAND[word] ?? SHORTHAND[collapsed] ?? collapsed;
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Tokens of the normalised text. */
export function tokens(value: string): string[] {
  const normalised = normalize(value);
  return normalised ? normalised.split(" ") : [];
}

/**
 * Similarity between two normalised strings, used to match a column the user
 * named approximately. Returns a value between 0 and 1.
 */
export function similarity(left: string, right: string): number {
  const a = normalize(left);
  const b = normalize(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;

  const distance = editDistance(a, b);
  return 1 - distance / Math.max(a.length, b.length);
}

/** Levenshtein distance, bounded by the shorter string for cheapness. */
function editDistance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0]!;
    previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const temporary = previous[j]!;
      previous[j] = Math.min(
        previous[j]! + 1,
        previous[j - 1]! + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diagonal = temporary;
    }
  }
  return previous[b.length]!;
}

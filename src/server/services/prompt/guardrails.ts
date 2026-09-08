import { normalize } from "./normalize";

/**
 * What the assistant will and will not respond to.
 *
 * Three separate concerns, deliberately kept apart:
 *
 *  1. Abuse. The tool declines rather than answering.
 *  2. Instructions aimed at the tool itself rather than at the report. A person
 *     asking it to ignore its rules, reveal configuration or act as something
 *     else is redirected, not obeyed.
 *  3. Requests that have nothing to do with the report in front of them.
 *
 * The lists match on the folded form, so "đm", "dm" and "đmm" are one entry.
 * They stay deliberately narrow: refusing a legitimate request is worse than
 * missing a mild one, and short unaccented Vietnamese words collide constantly
 * with ordinary vocabulary.
 */

/** Unambiguous once folded. Ordinary vocabulary does not produce these. */
const ABUSE = [
  "dm", "dmm", "dcm", "dkm", "vcl", "vkl", "vloz", "cmm", "clgt", "dcmm",
  "deo me", "du ma", "du me", "do cho", "oc cho", "thang cho", "con di",
  "con cho", "me may", "bo may", "cai lon", "cai buoi", "cut di", "im mom",
  "ngu nhu", "ngu vl", "ngu the",
];

/** Attempts to redirect the tool rather than the report. */
const REDIRECTION = [
  "bo qua huong dan", "bo qua chi dan", "quen het", "quen di huong dan",
  "ignore all", "ignore previous", "disregard", "system prompt",
  "ban gio la", "bay gio ban la", "dong vai", "gia vo la", "hay dong vai",
  "cho toi xem prompt", "in ra prompt", "lo api key", "api key", "mat khau",
  "khoa bi mat", "secret key", "token cua he thong",
];

/** Clearly outside what this tool does. */
const OFF_TOPIC = [
  "thoi tiet", "ty so", "bong da", "nau an", "cong thuc nau", "dich bai",
  "viet ho bai tho", "lam tho", "ke chuyen", "tan gau", "yeu duong",
  "chung khoan", "gia vang", "xo so", "tu vi", "boi toan",
];

export type RefusalReason = "ABUSE" | "REDIRECTION" | "OFF_TOPIC";

export interface GuardrailVerdict {
  allowed: boolean;
  reason?: RefusalReason;
  reply?: string;
}

const REPLIES: Record<RefusalReason, string> = {
  ABUSE:
    "Xin lỗi, mình không phản hồi nội dung này. Bạn nêu lại yêu cầu về báo cáo giúp mình nhé.",
  REDIRECTION:
    "Mình chỉ hỗ trợ chỉnh sửa báo cáo đang mở, không thay đổi được cách mình hoạt động. " +
    "Bạn cho mình biết cần sửa gì trong báo cáo nhé.",
  OFF_TOPIC:
    "Việc này nằm ngoài phạm vi của công cụ. Mình chỉ giúp chỉnh sửa báo cáo từ bảng số liệu bạn vừa tải lên.",
};

/**
 * Phrases are normalised with the very function that normalises the input.
 *
 * Normalisation collapses repeated letters, so "all" becomes "al". Comparing a
 * raw phrase against normalised text would therefore silently stop matching.
 * Passing both sides through the same function keeps them in step whatever the
 * rules become later.
 */
const NORMALISED = {
  abuse: ABUSE.map(normalize).filter(Boolean),
  redirection: REDIRECTION.map(normalize).filter(Boolean),
  offTopic: OFF_TOPIC.map(normalize).filter(Boolean),
};

/** Matches a phrase on word boundaries so it cannot fire inside a longer word. */
function contains(text: string, phrase: string): boolean {
  return new RegExp(`(^| )${phrase}( |$)`).test(text);
}

export function checkPrompt(rawPrompt: string): GuardrailVerdict {
  const text = normalize(rawPrompt);

  if (!text) {
    return {
      allowed: false,
      reason: "OFF_TOPIC",
      reply: "Bạn nhập yêu cầu giúp mình nhé, ví dụ: thêm biểu đồ tròn.",
    };
  }

  for (const phrase of NORMALISED.abuse) {
    if (contains(text, phrase)) {
      return { allowed: false, reason: "ABUSE", reply: REPLIES.ABUSE };
    }
  }
  for (const phrase of NORMALISED.redirection) {
    if (contains(text, phrase)) {
      return { allowed: false, reason: "REDIRECTION", reply: REPLIES.REDIRECTION };
    }
  }
  for (const phrase of NORMALISED.offTopic) {
    if (contains(text, phrase)) {
      return { allowed: false, reason: "OFF_TOPIC", reply: REPLIES.OFF_TOPIC };
    }
  }

  return { allowed: true };
}

/**
 * Google Sheets URL checks performed in the browser and on the server.
 *
 * This is user experience validation, not the security boundary. The real SSRF
 * protection lives in the Python service, which resolves the host and blocks
 * private address ranges before any request is made.
 */

const ALLOWED_HOSTS = ["docs.google.com", "spreadsheets.google.com"];
const SPREADSHEET_ID = /\/spreadsheets\/d\/(?:e\/)?([a-zA-Z0-9-_]{10,})/;

export interface SheetUrlCheck {
  valid: boolean;
  spreadsheetId?: string;
  gid?: string;
  message?: string;
}

export function checkSheetUrl(rawUrl: string): SheetUrlCheck {
  const trimmed = (rawUrl ?? "").trim();
  if (!trimmed) {
    return { valid: false, message: "Enter a Google Sheets address." };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, message: "This is not a valid web address." };
  }

  if (parsed.protocol !== "https:") {
    return { valid: false, message: "Only secure https addresses are allowed." };
  }
  if (!ALLOWED_HOSTS.includes(parsed.hostname.toLowerCase())) {
    return { valid: false, message: "Only Google Sheets addresses are supported." };
  }

  const match = SPREADSHEET_ID.exec(parsed.pathname);
  if (!match?.[1]) {
    return {
      valid: false,
      message: "The address should look like https://docs.google.com/spreadsheets/d/<id>/edit",
    };
  }

  const gid =
    new URLSearchParams(parsed.hash.replace(/^#/, "")).get("gid") ??
    parsed.searchParams.get("gid") ??
    undefined;

  return { valid: true, spreadsheetId: match[1], gid: gid ?? undefined };
}

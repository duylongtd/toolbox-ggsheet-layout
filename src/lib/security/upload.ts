/**
 * Upload rules shared by the browser and the server.
 *
 * The browser check gives immediate feedback. It is advisory only; the server
 * and the Python service repeat every check because a client value can be
 * forged.
 */

export const ALLOWED_UPLOAD_EXTENSIONS = [".xlsx", ".csv"] as const;

export const KNOWN_REJECTED_EXTENSIONS: Record<string, string> = {
  ".xls": "The legacy .xls format is not supported. Save the file as .xlsx.",
  ".xlsm": "Macro enabled workbooks are not supported. Save the file as .xlsx.",
  ".xlsb": "Binary workbooks are not supported. Save the file as .xlsx.",
  ".ods": "OpenDocument spreadsheets are not supported. Save the file as .xlsx.",
};

export function fileExtension(fileName: string): string {
  const index = fileName.lastIndexOf(".");
  return index >= 0 ? fileName.slice(index).toLowerCase() : "";
}

export interface UploadCheck {
  valid: boolean;
  message?: string;
}

export function checkUpload(
  fileName: string,
  sizeBytes: number,
  maxSizeBytes: number,
): UploadCheck {
  const extension = fileExtension(fileName);

  const knownRejection = KNOWN_REJECTED_EXTENSIONS[extension];
  if (knownRejection) {
    return { valid: false, message: knownRejection };
  }
  if (
    !ALLOWED_UPLOAD_EXTENSIONS.includes(extension as (typeof ALLOWED_UPLOAD_EXTENSIONS)[number])
  ) {
    return { valid: false, message: "Only .xlsx and .csv files are supported." };
  }
  if (sizeBytes <= 0) {
    return { valid: false, message: "The selected file is empty." };
  }
  if (sizeBytes > maxSizeBytes) {
    const limitMb = Math.round(maxSizeBytes / (1024 * 1024));
    return { valid: false, message: `The file is larger than the allowed limit of ${limitMb} MB.` };
  }
  return { valid: true };
}

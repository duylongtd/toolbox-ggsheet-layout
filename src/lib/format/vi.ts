/**
 * Interface wording.
 *
 * The people using this tool are administrative staff, not analysts. Nothing
 * here may contain an English technical term, a status code or a field name.
 * Every sentence says what happened and what to do next.
 */

export const T = {
  appName: "Trợ lý báo cáo dữ liệu",
  tagline: "Tải bảng số liệu lên, nhận lại báo cáo hoàn chỉnh",

  // Step 1
  uploadTitle: "Chọn tệp số liệu của bạn",
  uploadHint: "Kéo tệp vào đây, hoặc bấm để chọn",
  uploadFormats: "Nhận tệp Excel (.xlsx) và CSV, tối đa {0} MB",
  orLink: "Hoặc dán đường dẫn Google Sheets",
  linkPlaceholder: "https://docs.google.com/spreadsheets/...",
  linkNote:
    "Bảng tính phải được chia sẻ ở chế độ ai có đường dẫn đều xem được. Nếu là bảng riêng tư, bạn hãy tải tệp lên thay vì dán đường dẫn.",
  readData: "Xem dữ liệu",
  reading: "Đang đọc tệp...",

  // Step 2
  sheetTitle: "Bảng của bạn có {0} trang tính",
  sheetOne: "Dữ liệu trong tệp",
  sheetPick: "Bấm vào từng trang để xem trước, rồi chọn trang bạn muốn làm báo cáo",
  sheetEmpty: "Trang này không có bảng số liệu",
  previewNote: "Đang xem {0} dòng đầu của {1} dòng",
  columnsCount: "{0} cột",
  rowsCount: "{0} dòng",

  // Step 3
  suggestTitle: "Hệ thống đề xuất làm báo cáo như sau",
  suggestNote: "Bạn có thể tạo báo cáo ngay, hoặc nhắn yêu cầu chỉnh sửa ở phía dưới.",
  createReport: "Tạo báo cáo",
  creating: "Đang lập báo cáo...",
  creatingNote: "Việc này thường mất vài giây. Bạn có thể chờ tại đây.",

  // Step 4
  doneTitle: "Báo cáo đã xong",
  download: "Tải báo cáo PDF",
  startOver: "Làm báo cáo khác",
  chartsTitle: "Biểu đồ trong báo cáo",
  chartsNote: "Bỏ chọn biểu đồ bạn không cần, hoặc đổi kiểu hiển thị.",
  applyCharts: "Cập nhật báo cáo",

  // Prompt
  promptTitle: "Bạn muốn sửa gì thêm?",
  promptPlaceholder: "Ví dụ: thêm biểu đồ tròn, bỏ cột ghi chú, đổi tên báo cáo thành Quý 2",
  promptSend: "Gửi yêu cầu",
  promptThinking: "Đang xử lý yêu cầu...",

  // Errors
  errorTitle: "Chưa thực hiện được",
  retry: "Thử lại",
  fileTooBig: "Tệp lớn hơn mức cho phép là {0} MB.",
  fileWrongType: "Chỉ nhận tệp Excel (.xlsx) và CSV.",
  fileEmpty: "Tệp này trống.",
  linkInvalid: "Đường dẫn chưa đúng. Hãy sao chép lại đường dẫn Google Sheets.",
  needSource: "Bạn hãy chọn tệp hoặc dán đường dẫn trước.",
} as const;

/** Fills {0}, {1}, ... in a message. */
export function t(template: string, ...values: Array<string | number>): string {
  return template.replace(/\{(\d+)\}/g, (match, index) => {
    const value = values[Number(index)];
    return value === undefined ? match : String(value);
  });
}

/** "1.435" rather than "1435", which is how a Vietnamese report reads. */
export function num(value: unknown): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "-";
  return parsed.toLocaleString("vi-VN");
}

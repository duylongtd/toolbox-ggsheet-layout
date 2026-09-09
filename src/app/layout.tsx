import type { Metadata } from "next";
import { Anton } from "next/font/google";
import "./globals.css";

/**
 * The display face carries the poster, so it is loaded once at the root and
 * exposed as a variable. Vietnamese is included: without that subset every
 * diacritic in a headline falls back to another font mid word.
 */
const display = Anton({
  weight: "400",
  subsets: ["latin", "latin-ext", "vietnamese"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Trợ lý báo cáo dữ liệu",
    template: "%s · Trợ lý báo cáo dữ liệu",
  },
  description:
    "Đưa bảng số liệu Excel, CSV hoặc Google Sheets vào và nhận lại báo cáo PDF đầy đủ số liệu, biểu đồ và nhận xét.",
  applicationName: "Trợ lý báo cáo dữ liệu",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={display.variable}>
      <body>{children}</body>
    </html>
  );
}

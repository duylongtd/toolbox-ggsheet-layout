import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DataInsight Toolbox",
  description:
    "Turn spreadsheets into statistical analysis, charts and PDF reports with reusable data templates.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import { NextResponse } from "next/server";
import { route } from "@/server/http/route";
import { reportFileName } from "@/lib/format/filename";
import { createReportService } from "@/server/services/reportService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Streams the PDF.
 *
 * The file name is a transliterated slug of the report title plus its date, so
 * a Vietnamese title stays readable instead of collapsing into initials, and it
 * contains ASCII only, so a title can never inject header content.
 */
export const GET = route(
  { rateLimit: "download" },
  async ({ request, user, params, repositories }): Promise<NextResponse> => {
    const service = createReportService(repositories);
    const { report, content } = await service.download(String(params.id), user.id);

    const fileName = reportFileName(report.title, report.generatedAt);
    // The viewer asks for the same bytes shown in place rather than saved, so a
    // person can read the document before deciding to keep it.
    const inline = new URL(request.url).searchParams.get("inline") === "1";
    const disposition = inline ? "inline" : "attachment";

    return new NextResponse(new Uint8Array(content), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(content.byteLength),
        "Content-Disposition": `${disposition}; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  },
);

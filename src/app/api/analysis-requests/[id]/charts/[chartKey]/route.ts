import { NextResponse } from "next/server";
import { route } from "@/server/http/route";
import { createReportService } from "@/server/services/reportService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Streams a chart image from object storage after checking ownership. */
export const GET = route(
  { rateLimit: "download" },
  async ({ user, params, repositories }): Promise<NextResponse> => {
    const service = createReportService(repositories);
    const { chart, content } = await service.chartImage(
      String(params.id),
      String(params.chartKey),
      user.id,
    );

    return new NextResponse(new Uint8Array(content), {
      status: 200,
      headers: {
        "Content-Type": chart.contentType,
        "Content-Length": String(content.byteLength),
        "Cache-Control": "private, max-age=300",
        "Content-Security-Policy": "default-src 'none'",
        "X-Content-Type-Options": "nosniff",
      },
    });
  },
);

import { route } from "@/server/http/route";
import { ok } from "@/server/http/responses";
import { createReportService } from "@/server/services/reportService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({}, async ({ user, repositories, requestId }) => {
  const service = createReportService(repositories);
  return ok({ reports: await service.list(user.id) }, requestId);
});

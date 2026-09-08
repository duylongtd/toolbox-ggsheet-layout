import { NextResponse } from "next/server";
import { getAnalysisEngineClient } from "@/server/infrastructure/python/client";
import { route } from "@/server/http/route";
import { ok } from "@/server/http/responses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public liveness probe, used by the hosting platform's health check.
 *
 * It deliberately reports only whether the two halves are alive. Configuration
 * detail such as the database driver, the AI provider or the effective limits
 * would fingerprint the deployment, so it lives on the Settings page instead,
 * behind a session.
 */
export const GET = route({ auth: false }, async ({ requestId }): Promise<NextResponse> => {
  let engineReachable = false;
  try {
    const engine = (await getAnalysisEngineClient().health()) as { status?: string };
    engineReachable = engine.status === "ok";
  } catch {
    engineReachable = false;
  }

  return ok(
    {
      status: engineReachable ? "ok" : "degraded",
      analysisEngine: { reachable: engineReachable },
    },
    requestId,
    // The platform probe must still receive a 200 while the engine restarts,
    // otherwise a transient engine outage would take the web service down too.
    200,
  );
});

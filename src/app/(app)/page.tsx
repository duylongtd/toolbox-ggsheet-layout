import { Suspense } from "react";
import { Workspace } from "@/features/workspace/Workspace";
import { serverEnv } from "@/server/infrastructure/config/env";
import { requireUser } from "@/server/session";

export const dynamic = "force-dynamic";

/**
 * The product is this one page.
 *
 * There is no dashboard: someone who opens the tool wants a report, not a
 * summary of their past activity. Past reports remain available from the header.
 */
export default async function HomePage() {
  await requireUser();
  return (
    <Suspense fallback={null}>
      <Workspace maxUploadSizeMb={serverEnv.MAX_UPLOAD_SIZE_MB} />
    </Suspense>
  );
}

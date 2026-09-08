"use client";

import { Ban, Play, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge, statusTone } from "@/components/ui/StatusBadge";
import { Stepper } from "@/components/ui/Stepper";
import { TechnicalDetails } from "@/components/ui/TechnicalDetails";
import { ApiError, apiGet, apiPost } from "@/lib/api/client";
import { describeStatus } from "@/lib/format";
import type {
  AIAnalysis,
  AnalysisRequest,
  AnalysisResult,
  Chart,
  Dataset,
  Job,
  Report,
  Resolution,
  Template,
  TemplateVersion,
} from "@/types";
import { ConfigurationSummary } from "./ConfigurationSummary";
import { DatasetPreview } from "./DatasetPreview";
import { MatchPanel } from "./MatchPanel";
import { ResultsView } from "./ResultsView";
import { SaveTemplateDialog } from "./SaveTemplateDialog";
import {
  ANALYSIS_STEPS,
  STEP_CONFIGURATION,
  STEP_PREVIEW,
  STEP_RESULTS,
  STEP_VALIDATION,
} from "./steps";

export interface AnalysisDetail {
  request: AnalysisRequest;
  dataset: Dataset | null;
  result: AnalysisResult | null;
  charts: Chart[];
  ai: AIAnalysis | null;
  report: Report | null;
  job: Job | null;
  template: Template | null;
  templateVersion: TemplateVersion | null;
}

const POLL_INTERVAL_MS = 2000;
const ACTIVE_STATUSES = new Set([
  "VALIDATING",
  "INGESTING",
  "SCHEMA_ANALYSIS",
  "PROCESSING",
  "ANALYZING",
  "GENERATING_CHARTS",
  "AI_ANALYSIS",
  "GENERATING_PDF",
]);

/**
 * Steps three to eight of the wizard.
 *
 * While the pipeline runs, the view polls the request rather than holding an
 * open request, so a long analysis never blocks the browser.
 */
export function AnalysisWorkspace({
  initialDetail,
  templates,
}: {
  initialDetail: AnalysisDetail;
  templates: Template[];
}) {
  const router = useRouter();
  const [detail, setDetail] = useState(initialDetail);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<{ message: string; details?: unknown } | null>(
    null,
  );
  const [templatePromptDismissed, setTemplatePromptDismissed] = useState(false);

  const { request, dataset, result, charts, ai, report, template, templateVersion } = detail;
  const isActive = ACTIVE_STATUSES.has(request.status);

  const refresh = useCallback(async () => {
    try {
      const next = await apiGet<AnalysisDetail>(`/api/analysis-requests/${request.id}`);
      setDetail(next);
    } catch {
      // A transient poll failure is not surfaced; the next tick retries.
    }
  }, [request.id]);

  useEffect(() => {
    if (!isActive) return;
    const timer = setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isActive, refresh]);

  const currentStep = useMemo(() => {
    if (request.status === "COMPLETED") return STEP_RESULTS;
    if (isActive) return STEP_RESULTS;
    if (request.matchResult?.blocking) return STEP_VALIDATION;
    if (request.definition) return STEP_CONFIGURATION;
    return STEP_PREVIEW;
  }, [request.status, request.matchResult, request.definition, isActive]);

  async function runAnalysis() {
    setPending(true);
    setActionError(null);
    try {
      await apiPost(`/api/analysis-requests/${request.id}/run`);
      await refresh();
    } catch (caught) {
      setActionError(
        caught instanceof ApiError
          ? { message: caught.message, details: caught.details }
          : { message: "The analysis could not be started." },
      );
    } finally {
      setPending(false);
    }
  }

  async function cancelAnalysis() {
    setPending(true);
    try {
      await apiPost(`/api/analysis-requests/${request.id}/cancel`);
      await refresh();
    } catch (caught) {
      setActionError(
        caught instanceof ApiError
          ? { message: caught.message }
          : { message: "The analysis could not be cancelled." },
      );
    } finally {
      setPending(false);
    }
  }

  async function resolveMatch(resolution: Resolution) {
    setPending(true);
    setActionError(null);
    try {
      await apiPost(`/api/analysis-requests/${request.id}/resolve`, resolution);
      await refresh();
    } catch (caught) {
      setActionError(
        caught instanceof ApiError
          ? { message: caught.message, details: caught.details }
          : { message: "Your decisions could not be applied." },
      );
    } finally {
      setPending(false);
    }
  }

  const canRun =
    !isActive &&
    Boolean(request.definition) &&
    !request.matchResult?.blocking &&
    request.status !== "CANCELLED";

  return (
    <div className="space-y-6">
      <Stepper steps={ANALYSIS_STEPS} current={currentStep} />

      <Card
        title={request.title}
        description={
          template
            ? `Template: ${template.name} (version ${templateVersion?.version ?? template.currentVersion})`
            : "No template. The configuration was derived from this dataset."
        }
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge tone={statusTone(request.status)} label={describeStatus(request.status)} />
            {isActive && (
              <Button
                size="sm"
                variant="ghost"
                onClick={cancelAnalysis}
                disabled={pending}
                icon={<Ban className="h-4 w-4" aria-hidden />}
              >
                Cancel
              </Button>
            )}
            {!isActive && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void refresh()}
                icon={<RefreshCcw className="h-4 w-4" aria-hidden />}
              >
                Refresh
              </Button>
            )}
          </div>
        }
      >
        {request.status === "FAILED" && request.error && (
          <Alert level="danger" title="The analysis did not finish">
            <p>{request.error.message}</p>
            <TechnicalDetails payload={request.error.details} />
          </Alert>
        )}

        {isActive && (
          <Alert level="info" title="The analysis is running">
            You can leave this page. The work continues in the background and the results appear
            here when it finishes.
          </Alert>
        )}

        {actionError && (
          <Alert level="danger" title="Action could not be completed" className="mt-3">
            <p>{actionError.message}</p>
            <TechnicalDetails payload={actionError.details} />
          </Alert>
        )}
      </Card>

      {dataset && <DatasetPreview dataset={dataset} />}

      {request.matchResult && (
        <MatchPanel match={request.matchResult} onResolve={resolveMatch} pending={pending} />
      )}

      {request.definition && <ConfigurationSummary definition={request.definition} />}

      {canRun && (
        <Card title="Step 6: Run the analysis">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              The statistical engine computes every number, draws the charts and produces the PDF.
            </p>
            <Button
              onClick={runAnalysis}
              loading={pending}
              icon={<Play className="h-4 w-4" aria-hidden />}
            >
              {result ? "Run again" : "Run analysis"}
            </Button>
          </div>
        </Card>
      )}

      {request.status === "COMPLETED" && (
        <>
          <ResultsView
            result={result}
            charts={charts}
            ai={ai}
            report={report}
            analysisRequestId={request.id}
          />

          {!templatePromptDismissed && (
            <SaveTemplateDialog
              analysisRequestId={request.id}
              defaultName={request.title}
              templates={templates}
              onSaved={() => {
                setTemplatePromptDismissed(true);
                router.refresh();
              }}
              onDismiss={() => setTemplatePromptDismissed(true)}
            />
          )}
        </>
      )}
    </div>
  );
}

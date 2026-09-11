"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ApiError, apiGet, apiPost, apiUpload } from "@/lib/api/client";
import { T, t } from "@/lib/format/vi";
import { toDisplayText } from "@/lib/security/text";
import type {
  AIAnalysis,
  AnalysisRequest,
  AnalysisResult,
  Chart,
  Dataset,
  Report,
} from "@/types";
import { ChartControls } from "./ChartControls";
import { PlanApproval, type ProposedPlan } from "./PlanApproval";
import { PromptBox, type PromptReply } from "./PromptBox";
import { RunProgress } from "./RunProgress";
import { SheetPicker } from "./SheetPicker";
import { SourceStep } from "./SourceStep";
import { Suggestion } from "./Suggestion";

interface Detail {
  request: AnalysisRequest;
  dataset: Dataset | null;
  result: AnalysisResult | null;
  charts: Chart[];
  ai: AIAnalysis | null;
  report: Report | null;
}

const RUNNING = new Set([
  "VALIDATING", "INGESTING", "SCHEMA_ANALYSIS", "PROCESSING",
  "ANALYZING", "GENERATING_CHARTS", "AI_ANALYSIS", "GENERATING_PDF",
]);

/**
 * The whole product, on one page.
 *
 * There is no dashboard and no wizard to read: a person lands on an upload box,
 * looks at their data, and gets a report. Everything after that is optional
 * refinement.
 */
export function Workspace({ maxUploadSizeMb }: { maxUploadSizeMb: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idFromUrl = searchParams.get("bc");

  const [detail, setDetail] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [refining, setRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{ prompt: string; reply: PromptReply }>>([]);
  const [busyChartId, setBusyChartId] = useState<string | null>(null);

  const request = detail?.request;
  const running = request ? RUNNING.has(request.status) : false;
  // Read from the request rather than kept alongside it, so a proposal is still
  // waiting after a page refresh.
  const plan: ProposedPlan | null = request?.pendingPlan ?? null;

  const refresh = useCallback(async (id: string) => {
    try {
      setDetail(await apiGet<Detail>(`/api/analysis-requests/${id}`));
    } catch {
      // A failed poll is retried on the next tick.
    }
  }, []);

  useEffect(() => {
    if (!running || !request) return;
    const timer = setInterval(() => void refresh(request.id), 1000);
    return () => clearInterval(timer);
  }, [running, request, refresh]);

  // The report is addressable, so refreshing the page does not lose the work.
  // People do refresh, and losing a finished report to a stray F5 is not
  // something they should have to think about.
  useEffect(() => {
    if (idFromUrl && !detail) void refresh(idFromUrl);
  }, [idFromUrl, detail, refresh]);

  function describe(caught: unknown): string {
    return caught instanceof ApiError ? caught.message : "Có lỗi xảy ra. Bạn thử lại giúp mình.";
  }

  async function create(input: { file?: File; url?: string }) {
    setBusy(true);
    setError(null);
    try {
      const created = input.file
        ? await (() => {
            const form = new FormData();
            form.append("file", input.file!);
            return apiUpload<Detail>("/api/analysis-requests", form);
          })()
        : await apiPost<Detail>("/api/analysis-requests", {
            sourceType: "google_sheets",
            url: input.url,
          });
      await refresh(created.request.id);
      router.replace(`/?bc=${created.request.id}`, { scroll: false });
    } catch (caught) {
      setError(describe(caught));
    } finally {
      setBusy(false);
    }
  }

  async function selectSheet(sheetIndex: number) {
    if (!request) return;
    setSwitching(true);
    setError(null);
    try {
      await apiPost(`/api/analysis-requests/${request.id}/sheet`, { sheetIndex });
      await refresh(request.id);
    } catch (caught) {
      setError(describe(caught));
    } finally {
      setSwitching(false);
    }
  }

  async function run() {
    if (!request) return;
    setBusy(true);
    setError(null);
    try {
      await apiPost(`/api/analysis-requests/${request.id}/run`);
      await refresh(request.id);
    } catch (caught) {
      setError(describe(caught));
    } finally {
      setBusy(false);
    }
  }

  async function sendPrompt(prompt: string) {
    if (!request) return;
    setRefining(true);
    try {
      const reply = await apiPost<PromptReply>(`/api/analysis-requests/${request.id}/refine`, {
        prompt,
      });
      setHistory((current) => [...current, { prompt, reply }]);
      if (reply.status === "PROPOSED") {
        await refresh(request.id);
      } else if (reply.status === "APPLIED") {
        await apiPost(`/api/analysis-requests/${request.id}/run`);
        await waitForRun(request.id);
      }
    } catch (caught) {
      setHistory((current) => [
        ...current,
        { prompt, reply: { status: "UNCLEAR", reply: describe(caught) } },
      ]);
    } finally {
      setRefining(false);
    }
  }

  /**
   * Accepts or drops a proposed change.
   *
   * Only an accepted plan reaches the definition, and the report is redrawn as
   * part of accepting it: a plan that has been approved but not applied would
   * leave the page saying one thing and showing another.
   */
  async function decide(decision: "APPROVE" | "DISCARD") {
    if (!request || !plan) return;
    setRefining(true);
    setError(null);
    try {
      const reply = await apiPost<PromptReply>(`/api/analysis-requests/${request.id}/plan`, {
        planId: plan.id,
        decision,
      });
      setHistory((current) => [...current, { prompt: "", reply }]);
      if (decision === "APPROVE") {
        await apiPost(`/api/analysis-requests/${request.id}/run`);
        await waitForRun(request.id);
      } else {
        await refresh(request.id);
      }
    } catch (caught) {
      setError(describe(caught));
    } finally {
      setRefining(false);
    }
  }

  /**
   * Applies a change and redraws the report.
   *
   * The redraw is not optional: leaving it to a separate button meant the
   * control and the picture beside it disagreed until someone found that
   * button.
   */
  async function refine(operations: unknown[], chartId?: string) {
    if (!request) return;
    setBusyChartId(chartId ?? null);
    setRefining(true);
    setError(null);
    try {
      await apiPost(`/api/analysis-requests/${request.id}/refine`, { operations });
      await apiPost(`/api/analysis-requests/${request.id}/run`);
      await waitForRun(request.id);
    } catch (caught) {
      setError(describe(caught));
    } finally {
      setRefining(false);
      setBusyChartId(null);
    }
  }

  /** Polls until the pipeline finishes, so the caller can show progress. */
  async function waitForRun(id: string) {
    for (let attempt = 0; attempt < 90; attempt += 1) {
      const next = await apiGet<Detail>(`/api/analysis-requests/${id}`);
      setDetail(next);
      if (!RUNNING.has(next.request.status)) return;
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
  }

  function reset() {
    setDetail(null);
    setHistory([]);
    setError(null);
    router.replace("/", { scroll: false });
  }

  if (!detail || !request) {
    return <SourceStep maxUploadSizeMb={maxUploadSizeMb} pending={busy} onSubmit={create} />;
  }

  const done = request.status === "COMPLETED";
  const failed = request.status === "FAILED";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-900">
          <p className="font-medium">{T.errorTitle}</p>
          <p className="mt-0.5">{error}</p>
        </div>
      )}

      {failed && request.error && request.progress.length === 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-900">
          <p className="font-medium">{T.errorTitle}</p>
          <p className="mt-0.5">{request.error.message}</p>
        </div>
      )}

      {detail.dataset && (
        <SheetPicker
          sheets={request.sheets}
          dataset={detail.dataset}
          activeDatasetId={request.datasetId}
          switching={switching}
          onSelect={selectSheet}
        />
      )}

      {(running || (request.progress.length > 0 && (done || failed))) && (
        <RunProgress
          events={request.progress}
          running={running}
          failed={failed}
          startedAt={request.updatedAt}
        />
      )}

      {!running && !done && request.definition && (
        <Suggestion definition={request.definition} pending={busy} onRun={run} />
      )}

      {done && detail.report && (
        <section className="app-card px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <span
                aria-hidden
                className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
                  <path
                    d="m4.5 10.5 3.5 3.5 7.5-8"
                    stroke="#0b8043"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div>
                <p className="text-base font-semibold text-ink">{T.doneTitle}</p>
                <p className="text-sm text-ink-muted">
                  {toDisplayText(request.definition?.report.title ?? request.title, 80)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/reports/${detail.report.id}`}
                className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
              >
                Xem và tải báo cáo
              </Link>
              <Button variant="secondary" onClick={reset}>
                {T.startOver}
              </Button>
            </div>
          </div>
        </section>
      )}

      {done && request.definition && (
        <ChartControls
          definition={request.definition}
          charts={detail.charts}
          analysisRequestId={request.id}
          busyChartId={busyChartId}
          onToggle={(chartId, enabled) =>
            void refine([{ type: "SET_CHART_ENABLED", chartId, enabled }], chartId)
          }
          onChangeType={(chartId, chartType) =>
            void refine([{ type: "SET_CHART_TYPE", chartId, chartType }], chartId)
          }
        />
      )}

      {done && plan && (
        <PlanApproval
          plan={plan}
          pending={refining}
          onApprove={() => void decide("APPROVE")}
          onDiscard={() => void decide("DISCARD")}
        />
      )}

      {done && (
        <PromptBox pending={refining} history={history} onSend={(value) => void sendPrompt(value)} />
      )}
    </div>
  );
}

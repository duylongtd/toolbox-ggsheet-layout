"use client";

import { AlertTriangle, CheckCircle2, Download, Loader2, RotateCcw } from "lucide-react";
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
import { PromptBox, type PromptReply } from "./PromptBox";
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
  const [dirty, setDirty] = useState(false);

  const request = detail?.request;
  const running = request ? RUNNING.has(request.status) : false;

  const refresh = useCallback(async (id: string) => {
    try {
      setDetail(await apiGet<Detail>(`/api/analysis-requests/${id}`));
    } catch {
      // A failed poll is retried on the next tick.
    }
  }, []);

  useEffect(() => {
    if (!running || !request) return;
    const timer = setInterval(() => void refresh(request.id), 1500);
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
      setDirty(false);
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
      if (reply.status === "APPLIED") {
        await refresh(request.id);
        await run();
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

  async function refine(operations: unknown[]) {
    if (!request) return;
    setRefining(true);
    try {
      await apiPost(`/api/analysis-requests/${request.id}/refine`, { operations });
      await refresh(request.id);
      setDirty(true);
    } catch (caught) {
      setError(describe(caught));
    } finally {
      setRefining(false);
    }
  }

  function reset() {
    setDetail(null);
    setHistory([]);
    setError(null);
    setDirty(false);
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
        <div className="flex items-start gap-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">{T.errorTitle}</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {failed && request.error && (
        <div className="flex items-start gap-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">{T.errorTitle}</p>
            <p>{request.error.message}</p>
          </div>
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

      {running && (
        <div className="flex items-center gap-3 rounded-lg bg-blue-50 px-4 py-4 text-sm text-blue-900">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          <div>
            <p className="font-medium">{T.creating}</p>
            <p>{T.creatingNote}</p>
          </div>
        </div>
      )}

      {!running && !done && request.definition && (
        <Suggestion definition={request.definition} pending={busy} onRun={run} />
      )}

      {done && detail.report && (
        <section className="app-card px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-green-100 p-2 text-green-700">
                <CheckCircle2 className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-base font-semibold text-slate-900">{T.doneTitle}</p>
                <p className="text-sm text-slate-500">
                  {toDisplayText(request.definition?.report.title ?? request.title, 80)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href={`/api/reports/${detail.report.id}/download`}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-800"
              >
                <Download className="h-4 w-4" aria-hidden />
                {T.download}
              </a>
              <Button variant="secondary" onClick={reset} icon={<RotateCcw className="h-4 w-4" aria-hidden />}>
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
          pending={refining || busy}
          dirty={dirty}
          onToggle={(chartId, enabled) =>
            void refine([{ type: "SET_CHART_ENABLED", chartId, enabled }])
          }
          onChangeType={(chartId, chartType) =>
            void refine([{ type: "SET_CHART_TYPE", chartId, chartType }])
          }
          onApply={run}
        />
      )}

      {done && (
        <PromptBox pending={refining} history={history} onSend={(value) => void sendPrompt(value)} />
      )}
    </div>
  );
}

"use client";

import { FileSpreadsheet, Link2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Select, TextInput } from "@/components/ui/Field";
import { Stepper } from "@/components/ui/Stepper";
import { TechnicalDetails } from "@/components/ui/TechnicalDetails";
import { ApiError, apiPost, apiUpload } from "@/lib/api/client";
import { checkSheetUrl } from "@/lib/security/sheetUrl";
import { checkUpload } from "@/lib/security/upload";
import type { AnalysisRequest, Dataset, Template } from "@/types";
import { ANALYSIS_STEPS, STEP_SOURCE, STEP_TEMPLATE } from "./steps";

type SourceMode = "upload" | "sheet";

interface CreateResponse {
  request: AnalysisRequest;
  dataset: Dataset;
}

/**
 * Steps one and two of the wizard: choose a source and, optionally, a template.
 *
 * The file checks here mirror the server rules so the user gets an answer
 * immediately. The server and the analysis service repeat every check.
 */
export function NewAnalysisForm({
  templates,
  maxUploadSizeMb,
}: {
  templates: Template[];
  maxUploadSizeMb: number;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<SourceMode>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [title, setTitle] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; details?: unknown } | null>(null);

  const maxBytes = maxUploadSizeMb * 1024 * 1024;

  function selectFile(selected: File | null) {
    setError(null);
    if (!selected) {
      setFile(null);
      return;
    }
    const check = checkUpload(selected.name, selected.size, maxBytes);
    if (!check.valid) {
      setFile(null);
      setError({ message: check.message ?? "This file cannot be used." });
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    setFile(selected);
    if (!title) setTitle(selected.name.replace(/\.[^.]+$/, ""));
  }

  async function submit() {
    setError(null);

    if (mode === "upload" && !file) {
      setError({ message: "Choose a file to analyse." });
      return;
    }
    if (mode === "sheet") {
      const check = checkSheetUrl(sheetUrl);
      if (!check.valid) {
        setError({ message: check.message ?? "Enter a valid Google Sheets address." });
        return;
      }
    }

    setPending(true);
    try {
      let created: CreateResponse;
      if (mode === "upload" && file) {
        const form = new FormData();
        form.append("file", file);
        if (title.trim()) form.append("title", title.trim());
        if (templateId) form.append("templateId", templateId);
        if (sheetName.trim()) form.append("sheetName", sheetName.trim());
        created = await apiUpload<CreateResponse>("/api/analysis-requests", form);
      } else {
        created = await apiPost<CreateResponse>("/api/analysis-requests", {
          sourceType: "google_sheets",
          url: sheetUrl.trim(),
          sheetName: sheetName.trim() || null,
          title: title.trim() || undefined,
          templateId: templateId || null,
        });
      }
      router.push(`/analysis/${created.request.id}`);
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError({ message: caught.message, details: caught.details });
      } else {
        setError({ message: "The analysis could not be created. Please try again." });
      }
      setPending(false);
    }
  }

  const showGoogleFallback = Boolean(
    error?.details &&
      typeof error.details === "object" &&
      (error.details as Record<string, unknown>).fallback === "excel_upload",
  );

  return (
    <div className="space-y-6">
      <Stepper steps={ANALYSIS_STEPS} current={mode ? STEP_SOURCE : STEP_TEMPLATE} />

      {error && (
        <Alert level="danger" title="This source cannot be used">
          <p>{error.message}</p>
          {showGoogleFallback && (
            <p className="mt-2">
              Share the sheet so anyone with the link can view it, or upload the file as .xlsx or
              .csv instead.
            </p>
          )}
          <TechnicalDetails payload={error.details} />
        </Alert>
      )}

      <Card title="Step 1: Choose the data source">
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode("upload")}
            aria-pressed={mode === "upload"}
            className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
              mode === "upload"
                ? "border-blue-600 bg-blue-50"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <FileSpreadsheet className="mt-0.5 h-5 w-5 text-blue-700" aria-hidden />
            <span>
              <span className="block text-sm font-semibold text-slate-900">Upload a file</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                .xlsx or .csv, up to {maxUploadSizeMb} MB
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMode("sheet")}
            aria-pressed={mode === "sheet"}
            className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
              mode === "sheet"
                ? "border-blue-600 bg-blue-50"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <Link2 className="mt-0.5 h-5 w-5 text-blue-700" aria-hidden />
            <span>
              <span className="block text-sm font-semibold text-slate-900">Google Sheets link</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                The sheet must be viewable by anyone with the link
              </span>
            </span>
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {mode === "upload" ? (
            <Field
              label="Data file"
              htmlFor="analysis-file"
              hint={`Supported formats: .xlsx and .csv. Maximum size ${maxUploadSizeMb} MB.`}
            >
              <input
                id="analysis-file"
                ref={fileInput}
                type="file"
                accept=".xlsx,.csv"
                onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0
                           file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-medium
                           file:text-slate-700 hover:file:bg-slate-200"
              />
            </Field>
          ) : (
            <>
              <Field
                label="Google Sheets address"
                htmlFor="sheet-url"
                hint="Example: https://docs.google.com/spreadsheets/d/<id>/edit"
              >
                <TextInput
                  id="sheet-url"
                  value={sheetUrl}
                  onChange={(event) => setSheetUrl(event.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  inputMode="url"
                />
              </Field>
              <Alert level="info" title="About Google Sheets access">
                This application does not ask for permission to your Google Sheets. It can only read
                sheets that are viewable by anyone with the link. For a private sheet, upload the
                file instead.
              </Alert>
            </>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Analysis name" htmlFor="analysis-title">
              <TextInput
                id="analysis-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Quarterly processing report"
                maxLength={200}
              />
            </Field>
            <Field
              label="Worksheet name"
              htmlFor="sheet-name"
              hint="Leave empty to use the first worksheet."
            >
              <TextInput
                id="sheet-name"
                value={sheetName}
                onChange={(event) => setSheetName(event.target.value)}
                placeholder="Q1"
                maxLength={200}
              />
            </Field>
          </div>
        </div>
      </Card>

      <Card
        title="Step 2: Choose a template"
        description="A template reuses the column mapping, cleaning rules, metrics, charts and report layout from a previous analysis."
      >
        <Field
          label="Template"
          htmlFor="template-select"
          hint={
            templates.length === 0
              ? "You have no template yet. Run this analysis, then save its configuration as a template."
              : "Choose a template to reuse an existing configuration, or start without one."
          }
        >
          <Select
            id="template-select"
            value={templateId}
            onChange={(event) => setTemplateId(event.target.value)}
            disabled={templates.length === 0}
          >
            <option value="">Start without a template</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} (version {template.currentVersion})
              </option>
            ))}
          </Select>
        </Field>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={submit}
          loading={pending}
          icon={<Upload className="h-4 w-4" aria-hidden />}
        >
          Read the data
        </Button>
      </div>
    </div>
  );
}

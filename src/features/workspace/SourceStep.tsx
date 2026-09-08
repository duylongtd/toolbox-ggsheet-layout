"use client";

import { FileSpreadsheet, Link2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { T, t } from "@/lib/format/vi";
import { checkSheetUrl } from "@/lib/security/sheetUrl";
import { checkUpload } from "@/lib/security/upload";

/**
 * Step one: pick a file or paste a link.
 *
 * One decision, one button. There is no template chooser here: a person who has
 * never used the tool has nothing to choose from, and one who has can reuse a
 * report later from the report list.
 */
export function SourceStep({
  maxUploadSizeMb,
  pending,
  onSubmit,
}: {
  maxUploadSizeMb: number;
  pending: boolean;
  onSubmit: (input: { file?: File; url?: string }) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxBytes = maxUploadSizeMb * 1024 * 1024;

  function chooseFile(selected: File | null) {
    setError(null);
    setUrl("");
    if (!selected) return;
    const check = checkUpload(selected.name, selected.size, maxBytes);
    if (!check.valid) {
      setFile(null);
      setError(check.message ?? T.fileWrongType);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setFile(selected);
  }

  function submit() {
    setError(null);
    if (file) {
      onSubmit({ file });
      return;
    }
    if (url.trim()) {
      if (!checkSheetUrl(url).valid) {
        setError(T.linkInvalid);
        return;
      }
      onSubmit({ url: url.trim() });
      return;
    }
    setError(T.needSource);
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">{T.uploadTitle}</h1>
        <p className="mt-2 text-slate-500">{T.tagline}</p>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          chooseFile(event.dataTransfer.files?.[0] ?? null);
        }}
        className={`flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 transition-colors ${
          dragging
            ? "border-blue-500 bg-blue-50"
            : file
              ? "border-green-500 bg-green-50"
              : "border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50/40"
        }`}
      >
        <span
          className={`rounded-full p-4 ${file ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}
        >
          <FileSpreadsheet className="h-7 w-7" aria-hidden />
        </span>
        {file ? (
          <>
            <span className="text-base font-medium text-slate-900">{file.name}</span>
            <span className="text-sm text-slate-500">Bấm để chọn tệp khác</span>
          </>
        ) : (
          <>
            <span className="text-base font-medium text-slate-800">{T.uploadHint}</span>
            <span className="text-sm text-slate-500">{t(T.uploadFormats, maxUploadSizeMb)}</span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.csv"
        className="sr-only"
        onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
      />

      <div className="my-6 flex items-center gap-3 text-sm text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        <span>hoặc</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <label className="block">
        <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
          <Link2 className="h-4 w-4 text-slate-400" aria-hidden />
          {T.orLink}
        </span>
        <input
          type="url"
          inputMode="url"
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
            setFile(null);
            setError(null);
          }}
          placeholder={T.linkPlaceholder}
          className="app-input"
        />
      </label>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">{T.linkNote}</p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}

      <Button
        onClick={submit}
        loading={pending}
        className="mt-6 w-full justify-center py-3 text-base"
        icon={<Upload className="h-5 w-5" aria-hidden />}
      >
        {pending ? T.reading : T.readData}
      </Button>
    </div>
  );
}

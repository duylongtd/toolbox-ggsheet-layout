"use client";

import { useRef, useState } from "react";
import { LogoMark } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { T, t } from "@/lib/format/vi";
import { checkSheetUrl } from "@/lib/security/sheetUrl";
import { checkUpload } from "@/lib/security/upload";

/**
 * Step one: pick a file or paste a link.
 *
 * One decision and one button. No template chooser: someone opening the tool
 * for the first time has nothing to choose from.
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
    if (file) return onSubmit({ file });
    if (url.trim()) {
      if (!checkSheetUrl(url).valid) return setError(T.linkInvalid);
      return onSubmit({ url: url.trim() });
    }
    setError(T.needSource);
  }

  return (
    <div className="mx-auto w-full max-w-xl animate-fade-up">
      <div className="mb-9 text-center">
        <h1 className="text-[28px] font-semibold tracking-tight text-ink">{T.uploadTitle}</h1>
        <p className="mt-2 text-ink-muted">{T.tagline}</p>
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
        className={`flex w-full flex-col items-center gap-3.5 rounded-2xl border-2 border-dashed px-6 py-14 transition-all ${
          dragging
            ? "scale-[1.01] border-brand-500 bg-brand-50"
            : file
              ? "border-brand-500 bg-brand-50"
              : "border-[#dfe6e2] bg-white hover:border-brand-300 hover:bg-brand-50/50"
        }`}
      >
        <LogoMark className={`h-11 w-11 transition-opacity ${file ? "" : "opacity-30"}`} />
        {file ? (
          <>
            <span className="max-w-full truncate px-4 text-[15px] font-medium text-ink">
              {file.name}
            </span>
            <span className="text-sm text-ink-muted">Bấm để chọn tệp khác</span>
          </>
        ) : (
          <>
            <span className="text-[15px] font-medium text-ink">{T.uploadHint}</span>
            <span className="text-sm text-ink-muted">{t(T.uploadFormats, maxUploadSizeMb)}</span>
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

      <div className="my-7 flex items-center gap-4 text-sm text-ink-subtle">
        <span className="h-px flex-1 bg-[#dfe6e2]" />
        <span>hoặc</span>
        <span className="h-px flex-1 bg-[#dfe6e2]" />
      </div>

      <label className="block">
        <span className="app-label mb-2">{T.orLink}</span>
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
      <p className="mt-2 text-[13px] leading-relaxed text-ink-subtle">{T.linkNote}</p>

      {error && (
        <p className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}

      <Button onClick={submit} loading={pending} size="lg" className="mt-7 w-full justify-center">
        {pending ? T.reading : T.readData}
      </Button>
    </div>
  );
}

"use client";

import { Send, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { T } from "@/lib/format/vi";

export interface PromptReply {
  status: "APPLIED" | "REFUSED" | "UNCLEAR";
  reply: string;
  examples?: string[];
}

/**
 * The free text box.
 *
 * Whatever is typed is interpreted on the server into a fixed set of changes,
 * so the reply always says plainly what was done, what was declined, or what
 * was not understood. It never answers as an open ended assistant.
 */
export function PromptBox({
  pending,
  history,
  onSend,
}: {
  pending: boolean;
  history: Array<{ prompt: string; reply: PromptReply }>;
  onSend: (prompt: string) => void;
}) {
  const [value, setValue] = useState("");

  function send() {
    const trimmed = value.trim();
    if (!trimmed || pending) return;
    onSend(trimmed);
    setValue("");
  }

  return (
    <section className="app-card">
      <header className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
        <Sparkles className="h-4 w-4 text-blue-700" aria-hidden />
        <h2 className="text-base font-semibold text-slate-900">{T.promptTitle}</h2>
      </header>

      <div className="px-5 py-4">
        {history.length > 0 && (
          <ul className="mb-4 space-y-3">
            {history.map((entry, index) => (
              <li key={index} className="space-y-1.5">
                <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-blue-600 px-3.5 py-2 text-sm text-white">
                  {entry.prompt}
                </p>
                <div
                  className={`w-fit max-w-[85%] rounded-2xl rounded-bl-sm px-3.5 py-2 text-sm ${
                    entry.reply.status === "APPLIED"
                      ? "bg-green-50 text-green-900"
                      : entry.reply.status === "REFUSED"
                        ? "bg-red-50 text-red-900"
                        : "bg-slate-100 text-slate-700"
                  }`}
                >
                  <p>{entry.reply.reply}</p>
                  {entry.reply.examples && (
                    <ul className="mt-2 space-y-1">
                      {entry.reply.examples.map((example) => (
                        <li key={example}>
                          <button
                            type="button"
                            onClick={() => setValue(example)}
                            className="text-blue-700 underline underline-offset-2"
                          >
                            {example}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2">
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") send();
            }}
            placeholder={T.promptPlaceholder}
            maxLength={1000}
            className="app-input flex-1"
            aria-label={T.promptTitle}
          />
          <Button
            onClick={send}
            loading={pending}
            disabled={!value.trim()}
            icon={<Send className="h-4 w-4" aria-hidden />}
          >
            {pending ? T.promptThinking : T.promptSend}
          </Button>
        </div>
      </div>
    </section>
  );
}

"use client";

import { ArrowRight, Check, X } from "lucide-react";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge, matchTone } from "@/components/ui/StatusBadge";
import { TechnicalDetails } from "@/components/ui/TechnicalDetails";
import { describeMatchStatus } from "@/lib/format";
import type { ExtraColumnPolicy, MatchResult, Resolution } from "@/types";

/**
 * Template match review.
 *
 * Nothing here is applied automatically. A rename must be confirmed, and an
 * extra column never changes the template unless the user asks for it.
 */
export function MatchPanel({
  match,
  onResolve,
  pending,
}: {
  match: MatchResult;
  onResolve: (resolution: Resolution) => Promise<void>;
  pending: boolean;
}) {
  const [confirmed, setConfirmed] = useState<Record<string, string>>({});
  const [rejected, setRejected] = useState<Record<string, boolean>>({});
  const [extraPolicy, setExtraPolicy] = useState<ExtraColumnPolicy>("IGNORE");

  const requiredRenames = match.possibleRenames.filter((item) => item.required);
  const optionalRenames = match.possibleRenames.filter((item) => !item.required);
  const unresolvedRequired = requiredRenames.filter(
    (item) => !confirmed[item.templateKey] && !rejected[item.templateKey],
  );

  async function apply(policy: ExtraColumnPolicy) {
    await onResolve({
      confirmedRenames: Object.entries(confirmed).map(([templateColumnKey, datasetColumn]) => ({
        templateColumnKey,
        datasetColumn,
      })),
      extraColumnPolicy: policy,
      acknowledgedWarnings: true,
    });
  }

  return (
    <Card
      title="Step 4: Template validation"
      description="How this file compares with the template."
      actions={<StatusBadge tone={matchTone(match.status)} label={describeMatchStatus(match.status)} />}
    >
      <div className="space-y-5">
        <p className="text-sm text-slate-600">
          Match confidence: <span className="font-semibold">{Math.round(match.score * 100)}%</span>
          {match.orderChanged && " The column order differs, which does not affect the analysis."}
        </p>

        {match.status === "MISSING_REQUIRED_COLUMNS" && (
          <Alert level="danger" title="A required column is missing">
            <p>
              The template needs {formatList(match.missingRequiredColumns)}, which
              {match.missingRequiredColumns.length === 1 ? " is " : " are "}
              not present in this file.
            </p>
            <p className="mt-2">
              Add the column to your file and upload it again, or choose a different template.
            </p>
          </Alert>
        )}

        {requiredRenames.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">
              Confirm these column matches
            </h3>
            <p className="mb-3 text-sm text-slate-600">
              A column expected by the template was not found under its usual name. A similar column
              exists. Confirm it only if it holds the same information.
            </p>
            <ul className="space-y-3">
              {requiredRenames.map((suggestion) => (
                <RenameRow
                  key={suggestion.templateKey}
                  suggestion={suggestion}
                  confirmedColumn={confirmed[suggestion.templateKey]}
                  rejected={Boolean(rejected[suggestion.templateKey])}
                  onConfirm={(datasetColumn) => {
                    setConfirmed((current) => ({
                      ...current,
                      [suggestion.templateKey]: datasetColumn,
                    }));
                    setRejected((current) => ({ ...current, [suggestion.templateKey]: false }));
                  }}
                  onReject={() => {
                    setRejected((current) => ({ ...current, [suggestion.templateKey]: true }));
                    setConfirmed((current) => {
                      const next = { ...current };
                      delete next[suggestion.templateKey];
                      return next;
                    });
                  }}
                />
              ))}
            </ul>
          </div>
        )}

        {optionalRenames.length > 0 && (
          <Alert level="info" title="Optional columns with a possible match">
            <ul className="mt-1 space-y-1">
              {optionalRenames.map((suggestion) => (
                <li key={suggestion.templateKey}>
                  {suggestion.templateColumnName} may correspond to{" "}
                  {suggestion.candidates[0]?.datasetColumnName}.
                </li>
              ))}
            </ul>
          </Alert>
        )}

        {match.extraColumns.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">
              Your file contains {match.extraColumns.length} column
              {match.extraColumns.length === 1 ? "" : "s"} the template does not know
            </h3>
            <ul className="mb-3 flex flex-wrap gap-2">
              {match.extraColumns.map((column) => (
                <li
                  key={column.datasetColumn}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700"
                >
                  {column.datasetColumnName}
                </li>
              ))}
            </ul>
            <fieldset className="space-y-2">
              <legend className="sr-only">What to do with the extra columns</legend>
              <RadioOption
                name="extra-policy"
                value="IGNORE"
                checked={extraPolicy === "IGNORE"}
                onChange={() => setExtraPolicy("IGNORE")}
                label="Ignore them and continue"
                description="The template is left unchanged. This is the default."
              />
              <RadioOption
                name="extra-policy"
                value="ADD_TO_TEMPLATE"
                checked={extraPolicy === "ADD_TO_TEMPLATE"}
                onChange={() => setExtraPolicy("ADD_TO_TEMPLATE")}
                label="Add them to the template"
                description="Creates a new template version. Existing reports keep using the current version."
              />
            </fieldset>
          </div>
        )}

        {match.typeMismatches.length > 0 && (
          <Alert
            level={
              match.typeMismatches.some((item) => item.severity === "blocking")
                ? "danger"
                : "warning"
            }
            title="Some columns do not contain the expected kind of value"
          >
            <ul className="mt-1 space-y-1">
              {match.typeMismatches.map((mismatch) => (
                <li key={mismatch.templateKey}>
                  {mismatch.datasetColumnName} should contain {mismatch.expectedType} values but
                  contains {mismatch.actualType} values
                  {mismatch.severity === "blocking"
                    ? ". The analysis cannot run until this is corrected."
                    : ". Values that cannot be read as numbers will be treated as missing."}
                </li>
              ))}
            </ul>
          </Alert>
        )}

        {match.status === "MATCHED" && (
          <Alert level="success" title="The file matches this template">
            Every required column was found. The analysis can run with the saved configuration.
          </Alert>
        )}

        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <Button
            onClick={() => apply(extraPolicy)}
            loading={pending}
            disabled={unresolvedRequired.length > 0}
            icon={<Check className="h-4 w-4" aria-hidden />}
          >
            Apply these decisions
          </Button>
          {unresolvedRequired.length > 0 && (
            <p className="self-center text-xs text-slate-500">
              Confirm or reject every suggested column match first.
            </p>
          )}
        </div>

        <TechnicalDetails payload={match} />
      </div>
    </Card>
  );
}

function RenameRow({
  suggestion,
  confirmedColumn,
  rejected,
  onConfirm,
  onReject,
}: {
  suggestion: MatchResult["possibleRenames"][number];
  confirmedColumn?: string;
  rejected: boolean;
  onConfirm: (datasetColumn: string) => void;
  onReject: () => void;
}) {
  return (
    <li className="rounded-lg border border-slate-200 p-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-slate-900">{suggestion.templateColumnName}</span>
        <ArrowRight className="h-4 w-4 text-slate-400" aria-hidden />
        <span className="text-slate-700">
          {suggestion.candidates[0]?.datasetColumnName ?? "no candidate"}
        </span>
        {suggestion.candidates[0] && (
          <span className="text-xs text-slate-400">
            similarity {Math.round(suggestion.candidates[0].similarity * 100)}%
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {suggestion.candidates.map((candidate) => (
          <Button
            key={candidate.datasetColumn}
            size="sm"
            variant={confirmedColumn === candidate.datasetColumn ? "primary" : "secondary"}
            onClick={() => onConfirm(candidate.datasetColumn)}
            icon={<Check className="h-3.5 w-3.5" aria-hidden />}
          >
            Use {candidate.datasetColumnName}
          </Button>
        ))}
        <Button
          size="sm"
          variant={rejected ? "danger" : "ghost"}
          onClick={onReject}
          icon={<X className="h-3.5 w-3.5" aria-hidden />}
        >
          None of these
        </Button>
      </div>

      {rejected && (
        <p className="mt-2 text-xs text-red-700">
          Without this column the analysis cannot run. Upload a file that contains it, or choose a
          different template.
        </p>
      )}
    </li>
  );
}

function RadioOption({
  name,
  value,
  checked,
  onChange,
  label,
  description,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  description: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="mt-1"
      />
      <span>
        <span className="block text-sm font-medium text-slate-900">{label}</span>
        <span className="block text-xs text-slate-500">{description}</span>
      </span>
    </label>
  );
}

function formatList(values: string[]): string {
  if (values.length <= 1) return values[0] ?? "";
  return `${values.slice(0, -1).join(", ")} and ${values[values.length - 1]}`;
}

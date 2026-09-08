import { BarChart3, Calculator, FileText, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { toDisplayText } from "@/lib/security/text";
import type { TemplateDefinition } from "@/types";

/**
 * What the analysis will actually compute.
 *
 * Showing this before running is what makes "reuse the template" trustworthy:
 * the user can see that nothing was silently changed.
 */
export function ConfigurationSummary({ definition }: { definition: TemplateDefinition }) {
  return (
    <Card
      title="Step 5: Analysis configuration"
      description="These rules come from the template, or were derived from the first dataset."
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Section icon={<Calculator className="h-4 w-4" aria-hidden />} title="Metrics">
          {definition.analysis.metrics.length === 0 ? (
            <Empty>No metric is defined.</Empty>
          ) : (
            <ul className="space-y-1">
              {definition.analysis.metrics.map((metric) => (
                <li key={metric.key} className="text-sm text-slate-700">
                  {toDisplayText(metric.label, 80)}
                </li>
              ))}
            </ul>
          )}
          {definition.analysis.groupBy && (
            <p className="mt-2 text-xs text-slate-500">
              Grouped by {toDisplayText(columnLabel(definition, definition.analysis.groupBy), 60)}
            </p>
          )}
        </Section>

        <Section icon={<BarChart3 className="h-4 w-4" aria-hidden />} title="Charts">
          {definition.charts.length === 0 ? (
            <Empty>No chart is defined.</Empty>
          ) : (
            <ul className="space-y-1">
              {definition.charts.map((chart) => (
                <li key={chart.id} className="text-sm text-slate-700">
                  {toDisplayText(chart.title, 80)}
                  <span className="ml-1 text-xs text-slate-400">({chart.type})</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section icon={<FileText className="h-4 w-4" aria-hidden />} title="Report sections">
          <ul className="flex flex-wrap gap-1.5">
            {definition.report.sections.map((section) => (
              <li
                key={section}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
              >
                {section}
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={<Sparkles className="h-4 w-4" aria-hidden />} title="AI interpretation">
          <p className="text-sm text-slate-700">
            {definition.ai.enabled ? "Enabled" : "Disabled"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {definition.ai.allowRawData
              ? "Sample rows may be sent to the model."
              : "Only computed statistics are sent to the model. Raw rows are never sent."}
          </p>
        </Section>
      </div>

      {definition.derivedFields.length > 0 && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-900">Calculated fields</h3>
          <ul className="space-y-1">
            {definition.derivedFields.map((field, index) => (
              <li key={index} className="text-sm text-slate-700">
                {toDisplayText(String(field.label ?? field.key), 60)}
                <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">
                  {toDisplayText(String(field.expression ?? ""), 80)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <span className="text-slate-400">{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-500">{children}</p>;
}

function columnLabel(definition: TemplateDefinition, key: string): string {
  return definition.columns.find((column) => column.key === key)?.expectedName ?? key;
}

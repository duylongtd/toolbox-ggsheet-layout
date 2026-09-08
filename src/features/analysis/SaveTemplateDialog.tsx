"use client";

import { Save } from "lucide-react";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Select, TextArea, TextInput } from "@/components/ui/Field";
import { ApiError, apiPost } from "@/lib/api/client";
import type { Template } from "@/types";

/**
 * The prompt shown after a successful analysis.
 *
 * What is stored is the configuration, not the data. A sanitized sample is kept
 * only when the user explicitly asks for it.
 */
export function SaveTemplateDialog({
  analysisRequestId,
  defaultName,
  templates,
  onSaved,
  onDismiss,
}: {
  analysisRequestId: string;
  defaultName: string;
  templates: Template[];
  onSaved: () => void;
  onDismiss: () => void;
}) {
  const [mode, setMode] = useState<"NEW_TEMPLATE" | "NEW_VERSION">("NEW_TEMPLATE");
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [changeNote, setChangeNote] = useState("");
  const [saveSampleData, setSaveSampleData] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setPending(true);
    setError(null);
    try {
      await apiPost(`/api/analysis-requests/${analysisRequestId}/save-template`, {
        mode,
        templateId: mode === "NEW_VERSION" ? templateId : null,
        name: name.trim(),
        description: description.trim(),
        category: category.trim() || "general",
        changeNote: changeNote.trim(),
        saveSampleData,
      });
      onSaved();
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "The template could not be saved.",
      );
      setPending(false);
    }
  }

  return (
    <Card
      title="Save this configuration as a reusable template"
      description="Next quarter you can upload new data and reuse these rules without setting them up again."
    >
      <div className="space-y-4">
        {error && (
          <Alert level="danger" title="The template was not saved">
            {error}
          </Alert>
        )}

        {templates.length > 0 && (
          <Field label="What to save" htmlFor="save-mode">
            <Select
              id="save-mode"
              value={mode}
              onChange={(event) =>
                setMode(event.target.value as "NEW_TEMPLATE" | "NEW_VERSION")
              }
            >
              <option value="NEW_TEMPLATE">Create a new template</option>
              <option value="NEW_VERSION">Add a version to an existing template</option>
            </Select>
          </Field>
        )}

        {mode === "NEW_VERSION" ? (
          <>
            <Field label="Template" htmlFor="save-template-id">
              <Select
                id="save-template-id"
                value={templateId}
                onChange={(event) => setTemplateId(event.target.value)}
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} (version {template.currentVersion})
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="What changed"
              htmlFor="save-change-note"
              hint="Existing reports keep pointing at the version they were produced with."
            >
              <TextInput
                id="save-change-note"
                value={changeNote}
                onChange={(event) => setChangeNote(event.target.value)}
                maxLength={1000}
              />
            </Field>
          </>
        ) : (
          <>
            <Field label="Template name" htmlFor="save-name">
              <TextInput
                id="save-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={200}
                required
              />
            </Field>
            <Field label="Description" htmlFor="save-description">
              <TextArea
                id="save-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                maxLength={2000}
              />
            </Field>
            <Field label="Category" htmlFor="save-category">
              <TextInput
                id="save-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                maxLength={100}
              />
            </Field>
          </>
        )}

        <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
          <input
            type="checkbox"
            checked={saveSampleData}
            onChange={(event) => setSaveSampleData(event.target.checked)}
            className="mt-1"
          />
          <span>
            <span className="block text-sm font-medium text-slate-900">Save sample data</span>
            <span className="block text-xs text-slate-500">
              Stores up to ten preview rows with the template. Leave this off to store the
              configuration only.
            </span>
          </span>
        </label>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={save}
            loading={pending}
            disabled={mode === "NEW_TEMPLATE" ? !name.trim() : !templateId}
            icon={<Save className="h-4 w-4" aria-hidden />}
          >
            Save template
          </Button>
          <Button variant="secondary" onClick={onDismiss} disabled={pending}>
            Not now
          </Button>
        </div>
      </div>
    </Card>
  );
}

import type { Step } from "@/components/ui/Stepper";

/** The wizard steps, shared by the creation page and the workspace. */
export const ANALYSIS_STEPS: Step[] = [
  { id: 1, label: "Source" },
  { id: 2, label: "Template" },
  { id: 3, label: "Preview" },
  { id: 4, label: "Validation" },
  { id: 5, label: "Configuration" },
  { id: 6, label: "Results" },
];

export const STEP_SOURCE = 1;
export const STEP_TEMPLATE = 2;
export const STEP_PREVIEW = 3;
export const STEP_VALIDATION = 4;
export const STEP_CONFIGURATION = 5;
export const STEP_RESULTS = 6;

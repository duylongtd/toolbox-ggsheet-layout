import { z } from "zod";

/**
 * Request payload schemas.
 *
 * Validation happens once, at the edge of the server, so services always
 * receive well formed input.
 */

export const sheetSourceSchema = z.object({
  sourceType: z.literal("google_sheets"),
  url: z.string().min(1).max(2048),
  sheetName: z.string().max(200).nullish(),
  title: z.string().min(1).max(200).optional(),
  templateId: z.string().uuid().nullish(),
});

export type SheetSourceInput = z.infer<typeof sheetSourceSchema>;

export const validateRequestSchema = z.object({
  templateId: z.string().uuid(),
  templateVersionId: z.string().uuid().nullish(),
});

export const resolutionSchema = z.object({
  confirmedRenames: z
    .array(
      z.object({
        templateColumnKey: z.string().min(1).max(200),
        datasetColumn: z.string().min(1).max(200),
      }),
    )
    .max(200)
    .default([]),
  extraColumnPolicy: z.enum(["IGNORE", "ADD_TO_TEMPLATE"]).default("IGNORE"),
  acknowledgedWarnings: z.boolean().default(false),
});

export const saveTemplateSchema = z.object({
  mode: z.enum(["NEW_TEMPLATE", "NEW_VERSION"]).default("NEW_TEMPLATE"),
  templateId: z.string().uuid().nullish(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).default(""),
  category: z.string().min(1).max(100).default("general"),
  changeNote: z.string().max(1000).default(""),
  saveSampleData: z.boolean().default(false),
});

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).default(""),
  category: z.string().min(1).max(100).default("general"),
  definition: z.record(z.unknown()),
});

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  category: z.string().min(1).max(100).optional(),
  status: z.enum(["active", "archived"]).optional(),
});

export const createTemplateVersionSchema = z.object({
  definition: z.record(z.unknown()),
  changeNote: z.string().max(1000).default(""),
});

export const duplicateTemplateSchema = z.object({
  name: z.string().min(1).max(200),
});

export const validateDatasetSchema = z.object({
  datasetId: z.string().min(1).max(200),
  templateId: z.string().uuid(),
  templateVersionId: z.string().uuid().nullish(),
  confirmedRenames: z
    .array(
      z.object({
        templateColumnKey: z.string().min(1).max(200),
        datasetColumn: z.string().min(1).max(200),
      }),
    )
    .max(200)
    .default([]),
  ignoreExtraColumns: z.boolean().default(true),
});

export const emptySchema = z.object({}).passthrough();

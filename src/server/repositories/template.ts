import type { Template, TemplateDefinition, TemplateVersion } from "@/types";

export interface CreateTemplateInput {
  ownerId: string;
  name: string;
  description: string;
  category: string;
}

export interface TemplateRepository {
  create(input: CreateTemplateInput): Promise<Template>;
  findById(id: string): Promise<Template | null>;
  listByOwner(ownerId: string, includeArchived?: boolean): Promise<Template[]>;
  update(
    id: string,
    changes: Partial<Pick<Template, "name" | "description" | "category" | "status" | "currentVersion">>,
  ): Promise<Template>;
  recordUsage(id: string): Promise<void>;
  countByOwner(ownerId: string): Promise<number>;
  mostUsed(ownerId: string, limit: number): Promise<Array<{ id: string; name: string; usageCount: number }>>;
}

export interface CreateTemplateVersionInput {
  templateId: string;
  version: number;
  definition: TemplateDefinition;
  sampleDataset: Array<Record<string, string>> | null;
  changeNote: string;
  createdBy: string;
}

/** Template versions are immutable once created; there is no update method. */
export interface TemplateVersionRepository {
  create(input: CreateTemplateVersionInput): Promise<TemplateVersion>;
  findById(id: string): Promise<TemplateVersion | null>;
  listByTemplate(templateId: string): Promise<TemplateVersion[]>;
  findLatest(templateId: string): Promise<TemplateVersion | null>;
  findByVersion(templateId: string, version: number): Promise<TemplateVersion | null>;
}

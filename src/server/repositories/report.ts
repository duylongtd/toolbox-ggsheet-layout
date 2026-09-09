import type { Report } from "@/types";

export interface ReportRepository {
  create(input: Omit<Report, "id" | "generatedAt">): Promise<Report>;
  findById(id: string): Promise<Report | null>;
  findByRequestId(analysisRequestId: string): Promise<Report | null>;
  listByOwner(ownerId: string, limit?: number): Promise<Report[]>;
  /** Used to refuse deleting a template version that a report still references. */
  countByTemplateVersion(templateVersionId: string): Promise<number>;
}

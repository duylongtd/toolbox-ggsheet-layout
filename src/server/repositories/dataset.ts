import type { Dataset } from "@/types";

export interface DatasetRepository {
  /** Persists dataset metadata, columns and issues as one unit. */
  create(dataset: Omit<Dataset, "createdAt">): Promise<Dataset>;
  findById(id: string): Promise<Dataset | null>;
}

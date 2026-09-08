import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryRateLimiter } from "@/server/infrastructure/ratelimit/memory";
import { createMemoryRepositories } from "@/server/infrastructure/database/memory/repositories";
import { createTemplateService } from "@/server/services/templateService";
import {
  blockingMessage,
  extendDefinitionWithExtraColumns,
  toConfirmedMappings,
} from "@/server/services/analysisService";
import { AppError } from "@/server/http/errors";
import type { Repositories } from "@/server/repositories";
import type { Dataset, MatchResult, TemplateDefinition } from "@/types";

const OWNER = "00000000-0000-4000-8000-000000000001";
const OTHER = "00000000-0000-4000-8000-000000000002";

function definition(): TemplateDefinition {
  return {
    name: "Quarterly report",
    description: "",
    category: "general",
    columns: [
      {
        key: "department",
        expectedName: "Don vi",
        aliases: [],
        type: "string",
        required: true,
        description: "",
      },
      {
        key: "total",
        expectedName: "Tong ho so",
        aliases: [],
        type: "integer",
        required: true,
        description: "",
      },
    ],
    cleaning: {},
    derivedFields: [],
    analysis: {
      groupBy: "department",
      metrics: [],
      descriptiveColumns: [],
      rankings: [],
      outlierColumns: [],
      trendColumn: null,
    },
    charts: [],
    report: { title: "Report", subtitle: "", period: "", language: "vi", sections: ["summary"] },
    ai: { enabled: true, language: "vi", instructions: "", allowRawData: false },
  };
}

let repositories: Repositories;

beforeEach(async () => {
  repositories = createMemoryRepositories();
  for (const id of [OWNER, OTHER]) {
    await repositories.users.upsertFromAuth({
      id,
      email: `${id}@example.com`,
      displayName: null,
      avatarUrl: null,
    });
  }
});

describe("template service", () => {
  it("creates a template with version one holding the analysis definition", async () => {
    const service = createTemplateService(repositories);
    const created = await service.create({
      ownerId: OWNER,
      name: "Quarterly report",
      description: "Processing by department",
      category: "administration",
      definition: definition(),
    });

    expect(created.version.version).toBe(1);
    expect(created.version.definition.columns).toHaveLength(2);
    // The template stores configuration, never rows.
    expect(created.version.sampleDataset).toBeNull();
  });

  it("creates a new version instead of mutating the existing one", async () => {
    const service = createTemplateService(repositories);
    const created = await service.create({
      ownerId: OWNER,
      name: "Quarterly report",
      description: "",
      category: "general",
      definition: definition(),
    });

    const changed = definition();
    changed.columns.push({
      key: "note",
      expectedName: "Ghi chu",
      aliases: [],
      type: "string",
      required: false,
      description: "",
    });
    const version2 = await service.createVersion({
      templateId: created.template.id,
      ownerId: OWNER,
      definition: changed,
      changeNote: "Added a column",
    });

    expect(version2.version).toBe(2);
    const original = await repositories.templateVersions.findById(created.version.id);
    expect(original?.definition.columns).toHaveLength(2);

    const template = await repositories.templates.findById(created.template.id);
    expect(template?.currentVersion).toBe(2);
  });

  it("refuses access to a template owned by someone else", async () => {
    const service = createTemplateService(repositories);
    const created = await service.create({
      ownerId: OWNER,
      name: "Quarterly report",
      description: "",
      category: "general",
      definition: definition(),
    });

    await expect(service.detail(created.template.id, OTHER)).rejects.toBeInstanceOf(AppError);
  });

  it("records usage and returns the latest version by default", async () => {
    const service = createTemplateService(repositories);
    const created = await service.create({
      ownerId: OWNER,
      name: "Quarterly report",
      description: "",
      category: "general",
      definition: definition(),
    });
    await service.createVersion({
      templateId: created.template.id,
      ownerId: OWNER,
      definition: definition(),
      changeNote: "Second",
    });

    const used = await service.use(created.template.id, OWNER);
    expect(used.version.version).toBe(2);
    expect((await repositories.templates.findById(created.template.id))?.usageCount).toBe(1);
  });

  it("refuses to use an archived template", async () => {
    const service = createTemplateService(repositories);
    const created = await service.create({
      ownerId: OWNER,
      name: "Quarterly report",
      description: "",
      category: "general",
      definition: definition(),
    });
    await service.update(created.template.id, OWNER, { status: "archived" });

    await expect(service.use(created.template.id, OWNER)).rejects.toBeInstanceOf(AppError);
  });

  it("refuses to remove a version that a report references", async () => {
    const service = createTemplateService(repositories);
    const created = await service.create({
      ownerId: OWNER,
      name: "Quarterly report",
      description: "",
      category: "general",
      definition: definition(),
    });
    const request = await repositories.analysisRequests.create({
      ownerId: OWNER,
      title: "Q1",
      sourceType: "excel",
      sourceName: "q1.xlsx",
      templateId: created.template.id,
      templateVersionId: created.version.id,
      status: "COMPLETED",
    });
    await repositories.reports.create({
      analysisRequestId: request.id,
      ownerId: OWNER,
      title: "Q1",
      storageKey: "reports/q1.pdf",
      contentType: "application/pdf",
      sizeBytes: 1024,
      templateId: created.template.id,
      templateVersionId: created.version.id,
      reportVersion: "1.0.0",
      retentionExpiresAt: null,
    });

    await expect(service.assertVersionRemovable(created.version.id)).rejects.toBeInstanceOf(
      AppError,
    );
  });
});

describe("analysis service helpers", () => {
  it("turns confirmed renames into a mapping the matcher understands", () => {
    expect(
      toConfirmedMappings({
        confirmedRenames: [{ templateColumnKey: "completed", datasetColumn: "da_hoan_thanh" }],
        extraColumnPolicy: "IGNORE",
        acknowledgedWarnings: true,
      }),
    ).toEqual({ completed: "da_hoan_thanh" });
    expect(toConfirmedMappings(null)).toEqual({});
  });

  it("adds extra columns as optional and leaves the original definition untouched", () => {
    const original = definition();
    const match = {
      extraColumns: [
        { datasetColumn: "ghi_chu", datasetColumnName: "Ghi chu", inferredType: "string" },
      ],
    } as unknown as MatchResult;
    const datasetColumns = [
      {
        key: "ghi_chu",
        name: "Ghi chu",
        normalizedName: "ghi chu",
        index: 5,
        inferredType: "string",
        nullable: true,
        nullCount: 0,
        distinctCount: 3,
        numericRatio: 0,
        sampleValues: [],
      },
    ] as Dataset["columns"];

    const extended = extendDefinitionWithExtraColumns(original, match, datasetColumns);

    expect(original.columns).toHaveLength(2);
    expect(extended.columns).toHaveLength(3);
    // Added columns must be optional so an older file still matches.
    expect(extended.columns[2]?.required).toBe(false);
    expect(extended.columns[2]?.expectedName).toBe("Ghi chu");
  });

  it("explains each blocking match status in plain language", () => {
    expect(
      blockingMessage({
        status: "MISSING_REQUIRED_COLUMNS",
        missingRequiredColumns: ["Da xu ly"],
      } as MatchResult),
    ).toContain("Da xu ly");
    expect(blockingMessage({ status: "AMBIGUOUS_MAPPING" } as MatchResult)).toContain("confirmed");
    expect(blockingMessage({ status: "TYPE_MISMATCH" } as MatchResult)).toContain("kind of value");
  });
});

describe("rate limiter", () => {
  it("allows requests up to the limit and blocks the next one", async () => {
    const limiter = new InMemoryRateLimiter();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const decision = await limiter.check("bucket:user", 3, 60);
      expect(decision.allowed).toBe(true);
    }
    const blocked = await limiter.check("bucket:user", 3, 60);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("keeps separate counters per key", async () => {
    const limiter = new InMemoryRateLimiter();
    await limiter.check("bucket:a", 1, 60);
    const other = await limiter.check("bucket:b", 1, 60);
    expect(other.allowed).toBe(true);
  });

  it("starts a new window once the previous one expires", async () => {
    const limiter = new InMemoryRateLimiter();
    await limiter.check("bucket:expiring", 1, 0);
    const next = await limiter.check("bucket:expiring", 1, 60);
    expect(next.allowed).toBe(true);
  });
});

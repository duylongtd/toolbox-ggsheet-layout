import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryRepositories } from "@/server/infrastructure/database/memory/repositories";
import type { Repositories } from "@/server/repositories";
import type { TemplateDefinition } from "@/types";

/**
 * Repository contract tests.
 *
 * They run against the in-memory implementation but assert only behaviour
 * declared by the interfaces, so the same suite documents what any other
 * implementation has to provide.
 */

const definition = (): TemplateDefinition => ({
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
});

let repositories: Repositories;
let userId: string;

beforeEach(async () => {
  repositories = createMemoryRepositories();
  const user = await repositories.users.upsertFromAuth({
    id: "00000000-0000-4000-8000-000000000001",
    email: "owner@example.com",
    displayName: "Owner",
    avatarUrl: null,
  });
  userId = user.id;
});

describe("user repository", () => {
  it("creates on first sign in and refreshes the profile after", async () => {
    const updated = await repositories.users.upsertFromAuth({
      id: userId,
      email: "owner@example.com",
      displayName: "New name",
      avatarUrl: "https://example.com/a.png",
    });
    expect(updated.displayName).toBe("New name");
    expect(updated.email).toBe("owner@example.com");
  });

  it("records the login time", async () => {
    await repositories.users.recordLogin(userId);
    const user = await repositories.users.findById(userId);
    expect(user?.lastLoginAt).not.toBeNull();
  });
});

describe("template repositories", () => {
  it("keeps versions immutable and independently addressable", async () => {
    const template = await repositories.templates.create({
      ownerId: userId,
      name: "Quarterly report",
      description: "",
      category: "general",
    });

    const first = await repositories.templateVersions.create({
      templateId: template.id,
      version: 1,
      definition: definition(),
      sampleDataset: null,
      changeNote: "Initial",
      createdBy: userId,
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
    await repositories.templateVersions.create({
      templateId: template.id,
      version: 2,
      definition: changed,
      sampleDataset: null,
      changeNote: "Added a column",
      createdBy: userId,
    });

    const stored = await repositories.templateVersions.findById(first.id);
    expect(stored?.definition.columns).toHaveLength(1);

    const latest = await repositories.templateVersions.findLatest(template.id);
    expect(latest?.version).toBe(2);
    expect(latest?.definition.columns).toHaveLength(2);
  });

  it("counts usage and excludes archived templates from the default listing", async () => {
    const template = await repositories.templates.create({
      ownerId: userId,
      name: "Report",
      description: "",
      category: "general",
    });
    await repositories.templates.recordUsage(template.id);
    await repositories.templates.recordUsage(template.id);

    const reloaded = await repositories.templates.findById(template.id);
    expect(reloaded?.usageCount).toBe(2);
    expect(reloaded?.lastUsedAt).not.toBeNull();

    await repositories.templates.update(template.id, { status: "archived" });
    expect(await repositories.templates.listByOwner(userId)).toHaveLength(0);
    expect(await repositories.templates.listByOwner(userId, true)).toHaveLength(1);
  });

  it("scopes listings to the owner", async () => {
    await repositories.templates.create({
      ownerId: userId,
      name: "Mine",
      description: "",
      category: "general",
    });
    await repositories.templates.create({
      ownerId: "another-user",
      name: "Theirs",
      description: "",
      category: "general",
    });
    const mine = await repositories.templates.listByOwner(userId);
    expect(mine.map((template) => template.name)).toEqual(["Mine"]);
  });
});

describe("job repository", () => {
  async function createRequest() {
    return repositories.analysisRequests.create({
      ownerId: userId,
      title: "Q1",
      sourceType: "excel",
      sourceName: "q1.xlsx",
      templateId: null,
      templateVersionId: null,
      status: "WAITING_FOR_CONFIRMATION",
    });
  }

  it("claims a queued job exactly once", async () => {
    const request = await createRequest();
    await repositories.jobs.create({
      analysisRequestId: request.id,
      type: "ANALYSIS_PIPELINE",
      payload: {},
    });

    const first = await repositories.jobs.claimNext();
    const second = await repositories.jobs.claimNext();
    expect(first?.status).toBe("RUNNING");
    expect(first?.attempts).toBe(1);
    expect(second).toBeNull();
  });

  it("cancels queued jobs for a request", async () => {
    const request = await createRequest();
    const job = await repositories.jobs.create({
      analysisRequestId: request.id,
      type: "ANALYSIS_PIPELINE",
      payload: {},
    });
    await repositories.jobs.cancelForRequest(request.id);
    expect((await repositories.jobs.findById(job.id))?.status).toBe("CANCELLED");
  });
});

describe("analysis result repository", () => {
  it("replaces the stored result rather than accumulating duplicates", async () => {
    const request = await repositories.analysisRequests.create({
      ownerId: userId,
      title: "Q1",
      sourceType: "excel",
      sourceName: "q1.xlsx",
      templateId: null,
      templateVersionId: null,
      status: "PROCESSING",
    });

    const base = {
      analysisRequestId: request.id,
      statistics: [],
      groupSummary: [],
      rankings: [],
      outliers: [],
      trends: [],
      warnings: [],
    };

    await repositories.analysisResults.upsert({
      ...base,
      metrics: [{ key: "a", value: 1 }],
      timings: { totalMs: 1000 },
    });
    const second = await repositories.analysisResults.upsert({
      ...base,
      metrics: [{ key: "a", value: 2 }],
      timings: { totalMs: 2000 },
    });

    const stored = await repositories.analysisResults.findByRequestId(request.id);
    expect(stored?.id).toBe(second.id);
    expect(stored?.metrics).toEqual([{ key: "a", value: 2 }]);
    expect(stored?.timings).toEqual({ totalMs: 2000 });
  });
});

describe("chart repository", () => {
  it("replaces the chart set so a rerun leaves no orphans", async () => {
    const request = await repositories.analysisRequests.create({
      ownerId: userId,
      title: "Q1",
      sourceType: "excel",
      sourceName: "q1.xlsx",
      templateId: null,
      templateVersionId: null,
      status: "PROCESSING",
    });

    await repositories.charts.replaceForRequest(request.id, [
      { chartKey: "a", type: "bar", title: "A", config: {}, storageKey: "k1", contentType: "image/png" },
      { chartKey: "b", type: "pie", title: "B", config: {}, storageKey: "k2", contentType: "image/png" },
    ]);
    await repositories.charts.replaceForRequest(request.id, [
      { chartKey: "c", type: "line", title: "C", config: {}, storageKey: "k3", contentType: "image/png" },
    ]);

    const charts = await repositories.charts.listByRequest(request.id);
    expect(charts.map((chart) => chart.chartKey)).toEqual(["c"]);
  });
});

describe("audit log repository", () => {
  it("returns only the actor's own entries", async () => {
    await repositories.auditLogs.record({
      actorId: userId,
      action: "template.created",
      entityType: "template",
      entityId: "t1",
    });
    await repositories.auditLogs.record({
      actorId: "someone-else",
      action: "template.created",
      entityType: "template",
      entityId: "t2",
    });
    const entries = await repositories.auditLogs.listRecent(userId, 10);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.entityId).toBe("t1");
  });
});

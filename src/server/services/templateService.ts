import "server-only";
import type { Repositories } from "@/server/repositories";
import type { Template, TemplateDefinition, TemplateVersion } from "@/types";
import { AppError, ErrorCodes, forbidden, notFound } from "@/server/http/errors";
import { AuditActions, createAuditService } from "./auditService";

/**
 * Template lifecycle.
 *
 * A template is a container; every edit produces a new immutable version. A
 * version referenced by an existing report is never removed, so past reports
 * stay reproducible.
 */
export function createTemplateService(repositories: Repositories) {
  const audit = createAuditService(repositories);

  /** Loads a template and asserts the caller owns it. */
  async function requireOwned(templateId: string, ownerId: string): Promise<Template> {
    const template = await repositories.templates.findById(templateId);
    if (!template) throw notFound("This template no longer exists.");
    if (template.ownerId !== ownerId) throw forbidden("You do not have access to this template.");
    return template;
  }

  return {
    requireOwned,

    list(ownerId: string, includeArchived = false) {
      return repositories.templates.listByOwner(ownerId, includeArchived);
    },

    async detail(templateId: string, ownerId: string) {
      const template = await requireOwned(templateId, ownerId);
      const versions = await repositories.templateVersions.listByTemplate(templateId);
      const usage = await Promise.all(
        versions.map(async (version) => ({
          versionId: version.id,
          version: version.version,
          analysisCount: await repositories.analysisRequests.countByTemplateVersion(version.id),
          reportCount: await repositories.reports.countByTemplateVersion(version.id),
        })),
      );
      return { template, versions, usage };
    },

    async create(input: {
      ownerId: string;
      name: string;
      description: string;
      category: string;
      definition: TemplateDefinition;
      sampleDataset?: Array<Record<string, string>> | null;
    }): Promise<{ template: Template; version: TemplateVersion }> {
      const template = await repositories.templates.create({
        ownerId: input.ownerId,
        name: input.name,
        description: input.description,
        category: input.category,
      });

      const version = await repositories.templateVersions.create({
        templateId: template.id,
        version: 1,
        definition: { ...input.definition, name: input.name, description: input.description },
        sampleDataset: input.sampleDataset ?? null,
        changeNote: "Initial version",
        createdBy: input.ownerId,
      });

      await audit.record({
        actorId: input.ownerId,
        action: AuditActions.TEMPLATE_CREATED,
        entityType: "template",
        entityId: template.id,
        metadata: { columnCount: input.definition.columns.length, version: 1 },
      });

      return { template, version };
    },

    async update(
      templateId: string,
      ownerId: string,
      changes: Partial<Pick<Template, "name" | "description" | "category" | "status">>,
    ): Promise<Template> {
      await requireOwned(templateId, ownerId);
      const updated = await repositories.templates.update(templateId, changes);
      await audit.record({
        actorId: ownerId,
        action:
          changes.status === "archived"
            ? AuditActions.TEMPLATE_ARCHIVED
            : AuditActions.TEMPLATE_UPDATED,
        entityType: "template",
        entityId: templateId,
        metadata: { changedFields: Object.keys(changes) },
      });
      return updated;
    },

    /**
     * Creates the next version. The previous version is left untouched, so
     * reports generated with it keep resolving to the exact configuration used.
     */
    async createVersion(input: {
      templateId: string;
      ownerId: string;
      definition: TemplateDefinition;
      changeNote: string;
      sampleDataset?: Array<Record<string, string>> | null;
    }): Promise<TemplateVersion> {
      const template = await requireOwned(input.templateId, input.ownerId);
      const latest = await repositories.templateVersions.findLatest(input.templateId);
      const nextVersion = (latest?.version ?? 0) + 1;

      const version = await repositories.templateVersions.create({
        templateId: template.id,
        version: nextVersion,
        definition: input.definition,
        sampleDataset: input.sampleDataset ?? null,
        changeNote: input.changeNote,
        createdBy: input.ownerId,
      });
      await repositories.templates.update(template.id, { currentVersion: nextVersion });

      await audit.record({
        actorId: input.ownerId,
        action: AuditActions.TEMPLATE_VERSION_CREATED,
        entityType: "template_version",
        entityId: version.id,
        metadata: { templateId: template.id, version: nextVersion },
      });
      return version;
    },

    async duplicate(templateId: string, ownerId: string, name: string) {
      const template = await requireOwned(templateId, ownerId);
      const latest = await repositories.templateVersions.findLatest(templateId);
      if (!latest) throw notFound("This template has no version to copy.");

      const created = await this.create({
        ownerId,
        name,
        description: template.description,
        category: template.category,
        definition: latest.definition,
      });
      await audit.record({
        actorId: ownerId,
        action: AuditActions.TEMPLATE_DUPLICATED,
        entityType: "template",
        entityId: created.template.id,
        metadata: { sourceTemplateId: templateId },
      });
      return created;
    },

    /** Resolves the version to apply and records the usage. */
    async use(templateId: string, ownerId: string, versionId?: string | null) {
      const template = await requireOwned(templateId, ownerId);
      if (template.status === "archived") {
        throw new AppError(
          ErrorCodes.INVALID_STATE,
          "This template is archived. Restore it before using it again.",
          409,
        );
      }

      const version = versionId
        ? await repositories.templateVersions.findById(versionId)
        : await repositories.templateVersions.findLatest(templateId);
      if (!version || version.templateId !== templateId) {
        throw notFound("The requested template version does not exist.");
      }

      await repositories.templates.recordUsage(templateId);
      await audit.record({
        actorId: ownerId,
        action: AuditActions.TEMPLATE_USED,
        entityType: "template_version",
        entityId: version.id,
        metadata: { templateId, version: version.version },
      });
      return { template, version };
    },

    /** Refuses to remove a version that an existing report depends on. */
    async assertVersionRemovable(versionId: string): Promise<void> {
      const reportCount = await repositories.reports.countByTemplateVersion(versionId);
      if (reportCount > 0) {
        throw new AppError(
          ErrorCodes.TEMPLATE_IN_USE,
          "This template version is used by existing reports and cannot be removed.",
          409,
          { reportCount },
        );
      }
    },
  };
}

export type TemplateService = ReturnType<typeof createTemplateService>;

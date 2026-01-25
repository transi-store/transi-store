import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  // Users relations
  users: {
    organizationMemberships: r.many.organizationMembers(),
    createdProjects: r.many.projects({
      from: r.users.id,
      to: r.projects.createdBy,
    }),
  },

  // Organizations relations
  organizations: {
    members: r.many.organizationMembers(),
    projects: r.many.projects(),
    apiKeys: r.many.apiKeys(),
  },

  // API Keys relations
  apiKeys: {
    organization: r.one.organizations({
      from: r.apiKeys.organizationId,
      to: r.organizations.id,
    }),
    creator: r.one.users({
      from: r.apiKeys.createdBy,
      to: r.users.id,
    }),
  },

  // Organization Members relations
  organizationMembers: {
    user: r.one.users({
      from: r.organizationMembers.userId,
      to: r.users.id,
    }),
    organization: r.one.organizations({
      from: r.organizationMembers.organizationId,
      to: r.organizations.id,
    }),
  },

  // Projects relations
  projects: {
    organization: r.one.organizations({
      from: r.projects.organizationId,
      to: r.organizations.id,
    }),
    creator: r.one.users({
      from: r.projects.createdBy,
      to: r.users.id,
    }),
    languages: r.many.projectLanguages(),
    translationKeys: r.many.translationKeys(),
  },

  // Project Languages relations
  projectLanguages: {
    project: r.one.projects({
      from: r.projectLanguages.projectId,
      to: r.projects.id,
    }),
  },

  // Translation Keys relations
  translationKeys: {
    project: r.one.projects({
      from: r.translationKeys.projectId,
      to: r.projects.id,
    }),
    translations: r.many.translations(),
  },

  // Translations relations
  translations: {
    key: r.one.translationKeys({
      from: r.translations.keyId,
      to: r.translationKeys.id,
    }),
  },
}));

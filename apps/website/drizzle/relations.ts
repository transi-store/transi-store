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
    invitations: r.many.organizationInvitations(),
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

  // Organization Invitations relations
  organizationInvitations: {
    organization: r.one.organizations({
      from: r.organizationInvitations.organizationId,
      to: r.organizations.id,
    }),
    inviter: r.one.users({
      from: r.organizationInvitations.invitedBy,
      to: r.users.id,
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
    files: r.many.projectFiles(),
    translationKeys: r.many.translationKeys(),
    branches: r.many.branches(),
  },

  // Branches relations
  branches: {
    project: r.one.projects({
      from: r.branches.projectId,
      to: r.projects.id,
    }),
    creator: r.one.users({
      from: r.branches.createdBy,
      to: r.users.id,
    }),
    merger: r.one.users({
      from: r.branches.mergedBy,
      to: r.users.id,
    }),
    translationKeys: r.many.translationKeys(),
    keyDeletions: r.many.branchKeyDeletions(),
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
    branch: r.one.branches({
      from: r.translationKeys.branchId,
      to: r.branches.id,
    }),
    file: r.one.projectFiles({
      from: r.translationKeys.fileId,
      to: r.projectFiles.id,
    }),
    translations: r.many.translations(),
  },

  // Project Files relations
  projectFiles: {
    project: r.one.projects({
      from: r.projectFiles.projectId,
      to: r.projects.id,
    }),
    translationKeys: r.many.translationKeys(),
  },

  // Translations relations
  translations: {
    key: r.one.translationKeys({
      from: r.translations.keyId,
      to: r.translationKeys.id,
    }),
  },

  // Branch Key Deletions relations
  branchKeyDeletions: {
    branch: r.one.branches({
      from: r.branchKeyDeletions.branchId,
      to: r.branches.id,
    }),
    translationKey: r.one.translationKeys({
      from: r.branchKeyDeletions.translationKeyId,
      to: r.translationKeys.id,
    }),
  },
}));

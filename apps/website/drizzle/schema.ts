import {
  pgTable,
  varchar,
  text,
  boolean,
  timestamp,
  uniqueIndex,
  index,
  serial,
  integer,
} from "drizzle-orm/pg-core";
import { AI_PROVIDERS } from "~/lib/ai-providers";
import { BRANCH_STATUS } from "~/lib/branches";
import { SupportedFormat } from "@transi-store/common";

function ensureOneItem<T>(arr: T[]): [T, ...T[]] {
  if (arr.length === 0) {
    throw new Error("Array must contain at least one item");
  }

  return arr as [T, ...T[]];
}

// Utilisateurs (lies a OAuth)
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    name: varchar("name", { length: 255 }),
    oauthProvider: varchar("oauth_provider", { length: 50 }).notNull(),
    oauthSubject: varchar("oauth_subject", { length: 255 }).notNull(),
    lastOrganizationId: integer("last_organization_id").references(
      () => organizations.id,
    ),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("unique_oauth").on(table.oauthProvider, table.oauthSubject),
  ],
);

// Organisations
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Membres d'organisation (relation N-N users <-> organizations)
export const organizationMembers = pgTable(
  "organization_members",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("unique_org_user").on(table.organizationId, table.userId),
  ],
);

// Invitations d'organisation
export const organizationInvitations = pgTable(
  "organization_invitations",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    invitationCode: varchar("invitation_code", { length: 32 })
      .notNull()
      .unique(),
    invitedEmail: varchar("invited_email", { length: 255 }), // Nullable for organization-wide invitations
    isUnlimited: boolean("is_unlimited").default(false).notNull(), // True for organization-wide invitations
    invitedBy: integer("invited_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // Conditional unique constraint: only for email-based invitations (when invitedEmail is not null)
    uniqueIndex("unique_org_email").on(
      table.organizationId,
      table.invitedEmail,
    ),
    index("idx_invitation_code").on(table.invitationCode),
  ],
);

// Clés d'API pour l'authentification automatisée
export const apiKeys = pgTable(
  "api_keys",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    keyValue: varchar("key_value", { length: 32 }).notNull().unique(),
    name: varchar("name", { length: 255 }),
    createdBy: integer("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    lastUsedAt: timestamp("last_used_at"),
  },
  (table) => [index("idx_key_value").on(table.keyValue)],
);

// Projets (appartiennent a une organisation)
export const projects = pgTable(
  "projects",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    description: text("description"),
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("unique_org_slug").on(table.organizationId, table.slug),
  ],
);

// Langues disponibles par projet
export const projectLanguages = pgTable(
  "project_languages",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    locale: varchar("locale", { length: 10 }).notNull(), // 'fr', 'en', 'de', etc.
    isDefault: boolean("is_default").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("unique_project_locale").on(table.projectId, table.locale),
  ],
);

// Branches de traduction
export const branches = pgTable(
  "branches",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    description: text("description"),
    status: varchar("status", {
      length: 20,
      enum: ensureOneItem(Object.values(BRANCH_STATUS)),
    })
      .default(BRANCH_STATUS.OPEN)
      .notNull(),
    createdBy: integer("created_by").references(() => users.id),
    mergedBy: integer("merged_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    mergedAt: timestamp("merged_at"),
  },
  (table) => [
    uniqueIndex("unique_project_branch_slug").on(table.projectId, table.slug),
  ],
);

// Translation files (multiple files per project, e.g. common.json, admin.yaml)
export const projectFiles = pgTable(
  "project_files",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    format: varchar("format", {
      length: 20,
      enum: ensureOneItem(Object.values(SupportedFormat)),
    }).notNull(),
    // Relative path with a <lang> placeholder, e.g. "locales/<lang>/common.json".
    // Must not contain "../" (validated server-side and in the CLI).
    filePath: varchar("file_path", { length: 500 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("unique_project_file_path").on(table.projectId, table.filePath),
  ],
);

// Cles de traduction
export const translationKeys = pgTable(
  "translation_keys",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    branchId: integer("branch_id").references(() => branches.id, {
      onDelete: "cascade",
    }),
    fileId: integer("file_id")
      .notNull()
      .references(() => projectFiles.id, {
        onDelete: "cascade",
      }),
    keyName: varchar("key_name", { length: 500 }).notNull(),
    description: text("description"),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("unique_project_file_key").on(
      table.projectId,
      table.fileId,
      table.keyName,
    ),
    index("idx_keys_name").on(table.keyName),
    // Index GIN pour la recherche floue seront créés via SQL (voir scripts/enable-fuzzy-search.sh)
  ],
);

// Clés de traduction marquées pour suppression dans une branche
export const branchKeyDeletions = pgTable(
  "branch_key_deletions",
  {
    id: serial("id").primaryKey(),
    branchId: integer("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    translationKeyId: integer("translation_key_id")
      .notNull()
      .references(() => translationKeys.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("unique_branch_key_deletion").on(
      table.branchId,
      table.translationKeyId,
    ),
  ],
);

// Traductions
export const translations = pgTable(
  "translations",
  {
    id: serial("id").primaryKey(),
    keyId: integer("key_id")
      .notNull()
      .references(() => translationKeys.id, { onDelete: "cascade" }),
    locale: varchar("locale", { length: 10 }).notNull(),
    value: text("value").notNull(),
    isFuzzy: boolean("is_fuzzy").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("unique_key_locale").on(table.keyId, table.locale),
    // Index GIN pour la recherche floue sera créé via SQL (voir scripts/enable-fuzzy-search.sh)
  ],
);

// Documents Markdown / MDX : une ligne par locale, source de vérité du
// contenu pour un projectFile au format document.
export const markdownDocumentTranslations = pgTable(
  "markdown_document_translations",
  {
    id: serial("id").primaryKey(),
    projectFileId: integer("project_file_id")
      .notNull()
      .references(() => projectFiles.id, { onDelete: "cascade" }),
    locale: varchar("locale", { length: 10 }).notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("unique_md_translation_file_locale").on(
      table.projectFileId,
      table.locale,
    ),
  ],
);

// Sidecar : métadonnées par section (isFuzzy, dernière trad IA), keyé par
// structuralPath calculé depuis l'AST mdast (cf. lib/markdown-sections.ts)
// et rattaché directement à la ligne de traduction concernée.
export const markdownSectionStates = pgTable(
  "markdown_section_states",
  {
    id: serial("id").primaryKey(),
    documentTranslationId: integer("document_translation_id")
      .notNull()
      .references(() => markdownDocumentTranslations.id, {
        onDelete: "cascade",
      }),
    structuralPath: varchar("structural_path", { length: 500 }).notNull(),
    isFuzzy: boolean("is_fuzzy").default(false).notNull(),
    lastAiTranslatedAt: timestamp("last_ai_translated_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("unique_section_state").on(
      table.documentTranslationId,
      table.structuralPath,
    ),
    index("idx_section_state_translation").on(table.documentTranslationId),
  ],
);

// Providers IA pour la traduction automatique (par organisation)
export const organizationAiProviders = pgTable(
  "organization_ai_providers",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    provider: varchar("provider", {
      length: 50,
      enum: ensureOneItem(AI_PROVIDERS.map((p) => p.value)),
    }).notNull(),
    encryptedApiKey: text("encrypted_api_key").notNull(), // Chiffré AES-256-GCM
    model: varchar("model", { length: 100 }),
    isActive: boolean("is_active").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("unique_org_provider").on(table.organizationId, table.provider),
  ],
);

// Types inferes pour TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;

export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type NewOrganizationMember = typeof organizationMembers.$inferInsert;

export type OrganizationInvitation =
  typeof organizationInvitations.$inferSelect;
export type NewOrganizationInvitation =
  typeof organizationInvitations.$inferInsert;

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type ProjectLanguage = typeof projectLanguages.$inferSelect;
export type NewProjectLanguage = typeof projectLanguages.$inferInsert;

export type ProjectFile = typeof projectFiles.$inferSelect;
export type NewProjectFile = typeof projectFiles.$inferInsert;

export type Branch = typeof branches.$inferSelect;
export type NewBranch = typeof branches.$inferInsert;

export type TranslationKey = typeof translationKeys.$inferSelect;
export type NewTranslationKey = typeof translationKeys.$inferInsert;

export type Translation = typeof translations.$inferSelect;
export type NewTranslation = typeof translations.$inferInsert;

export type OrganizationAiProvider =
  typeof organizationAiProviders.$inferSelect;
export type NewOrganizationAiProvider =
  typeof organizationAiProviders.$inferInsert;

export type BranchKeyDeletion = typeof branchKeyDeletions.$inferSelect;
export type NewBranchKeyDeletion = typeof branchKeyDeletions.$inferInsert;

export type MarkdownDocumentTranslation =
  typeof markdownDocumentTranslations.$inferSelect;
export type NewMarkdownDocumentTranslation =
  typeof markdownDocumentTranslations.$inferInsert;

export type MarkdownSectionState = typeof markdownSectionStates.$inferSelect;
export type NewMarkdownSectionState =
  typeof markdownSectionStates.$inferInsert;

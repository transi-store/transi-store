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

// Cles de traduction
export const translationKeys = pgTable(
  "translation_keys",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    keyName: varchar("key_name", { length: 500 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("unique_project_key").on(table.projectId, table.keyName),
    index("idx_keys_name").on(table.keyName),
    // Index GIN pour la recherche floue seront créés via SQL (voir scripts/enable-fuzzy-search.sh)
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
    // GitHub sync support (3-way merge)
    // Dernière valeur qui venait de GitHub (la base commune pour détecter les conflits)
    githubSyncedValue: text("github_synced_value"),
    // En cas de conflit : valeur entrante depuis GitHub, à valider manuellement
    conflictIncomingValue: text("conflict_incoming_value"),
    hasConflict: boolean("has_conflict").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("unique_key_locale").on(table.keyId, table.locale),
    // Index GIN pour la recherche floue sera créé via SQL (voir scripts/enable-fuzzy-search.sh)
  ],
);

// Installations de la GitHub App (une par compte GitHub lié à une organisation)
export const githubAppInstallations = pgTable(
  "github_app_installations",
  {
    id: serial("id").primaryKey(),
    // L'ID d'installation fourni par GitHub
    installationId: varchar("installation_id", { length: 50 })
      .notNull()
      .unique(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    // Nom du compte GitHub (org ou user) ayant installé l'App
    accountLogin: varchar("account_login", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
);

// Configuration GitHub par projet (lie un projet transi-store à un repo GitHub)
export const projectGithubConfigs = pgTable("project_github_configs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .unique()
    .references(() => projects.id, { onDelete: "cascade" }),
  installationId: integer("installation_id")
    .notNull()
    .references(() => githubAppInstallations.id, { onDelete: "cascade" }),
  // Nom complet du repo, ex: "my-org/my-app"
  repoFullName: varchar("repo_full_name", { length: 500 }).notNull(),
  defaultBranch: varchar("default_branch", { length: 255 })
    .notNull()
    .default("main"),
  // Locale source (celle gérée par les devs dans le repo)
  sourceLocale: varchar("source_locale", { length: 10 }).notNull(),
  // Pattern du chemin des fichiers JSON, avec {locale} comme placeholder
  // Ex: "public/locales/{locale}.json" ou "locales/{locale}/translation.json"
  localePathPattern: varchar("locale_path_pattern", { length: 500 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

function ensureOneItem<T>(arr: T[]): [T, ...T[]] {
  if (arr.length === 0) {
    throw new Error("Array must contain at least one item");
  }

  return arr as [T, ...T[]];
}

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

export type TranslationKey = typeof translationKeys.$inferSelect;
export type NewTranslationKey = typeof translationKeys.$inferInsert;

export type Translation = typeof translations.$inferSelect;
export type NewTranslation = typeof translations.$inferInsert;

export type OrganizationAiProvider =
  typeof organizationAiProviders.$inferSelect;
export type NewOrganizationAiProvider =
  typeof organizationAiProviders.$inferInsert;

export type GithubAppInstallation =
  typeof githubAppInstallations.$inferSelect;
export type NewGithubAppInstallation =
  typeof githubAppInstallations.$inferInsert;

export type ProjectGithubConfig = typeof projectGithubConfigs.$inferSelect;
export type NewProjectGithubConfig = typeof projectGithubConfigs.$inferInsert;

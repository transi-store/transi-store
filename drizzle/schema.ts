import {
  mysqlTable,
  varchar,
  text,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

// Utilisateurs (lies a OAuth)
export const users = mysqlTable(
  "users",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    name: varchar("name", { length: 255 }),
    oauthProvider: varchar("oauth_provider", { length: 50 }).notNull(),
    oauthSubject: varchar("oauth_subject", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("unique_oauth").on(table.oauthProvider, table.oauthSubject),
  ]
);

// Organisations
export const organizations = mysqlTable("organizations", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// Membres d'organisation (relation N-N users <-> organizations)
export const organizationMembers = mysqlTable(
  "organization_members",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("unique_org_user").on(table.organizationId, table.userId),
  ]
);

// Clés d'API pour l'authentification automatisée
export const apiKeys = mysqlTable(
  "api_keys",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    keyValue: varchar("key_value", { length: 32 }).notNull().unique(),
    name: varchar("name", { length: 255 }),
    createdBy: varchar("created_by", { length: 36 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    lastUsedAt: timestamp("last_used_at"),
  },
  (table) => [index("idx_key_value").on(table.keyValue)]
);

// Projets (appartiennent a une organisation)
export const projects = mysqlTable(
  "projects",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    description: text("description"),
    createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("unique_org_slug").on(table.organizationId, table.slug),
  ]
);

// Langues disponibles par projet
export const projectLanguages = mysqlTable(
  "project_languages",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    projectId: varchar("project_id", { length: 36 })
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    locale: varchar("locale", { length: 10 }).notNull(), // 'fr', 'en', 'de', etc.
    isDefault: boolean("is_default").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("unique_project_locale").on(table.projectId, table.locale),
  ]
);

// Cles de traduction
export const translationKeys = mysqlTable(
  "translation_keys",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    projectId: varchar("project_id", { length: 36 })
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    keyName: varchar("key_name", { length: 500 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("unique_project_key").on(table.projectId, table.keyName),
    index("idx_keys_name").on(table.keyName),
  ]
);

// Traductions
export const translations = mysqlTable(
  "translations",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    keyId: varchar("key_id", { length: 36 })
      .notNull()
      .references(() => translationKeys.id, { onDelete: "cascade" }),
    locale: varchar("locale", { length: 10 }).notNull(),
    value: text("value").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [uniqueIndex("unique_key_locale").on(table.keyId, table.locale)]
);

// Types inferes pour TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;

export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type NewOrganizationMember = typeof organizationMembers.$inferInsert;

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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  organizationMemberships: many(organizationMembers),
  createdProjects: many(projects),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  projects: many(projects),
  apiKeys: many(apiKeys),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  organization: one(organizations, {
    fields: [apiKeys.organizationId],
    references: [organizations.id],
  }),
  creator: one(users, {
    fields: [apiKeys.createdBy],
    references: [users.id],
  }),
}));

export const organizationMembersRelations = relations(
  organizationMembers,
  ({ one }) => ({
    user: one(users, {
      fields: [organizationMembers.userId],
      references: [users.id],
    }),
    organization: one(organizations, {
      fields: [organizationMembers.organizationId],
      references: [organizations.id],
    }),
  })
);

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.id],
  }),
  creator: one(users, {
    fields: [projects.createdBy],
    references: [users.id],
  }),
  languages: many(projectLanguages),
  translationKeys: many(translationKeys),
}));

export const projectLanguagesRelations = relations(
  projectLanguages,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectLanguages.projectId],
      references: [projects.id],
    }),
  })
);

export const translationKeysRelations = relations(
  translationKeys,
  ({ one, many }) => ({
    project: one(projects, {
      fields: [translationKeys.projectId],
      references: [projects.id],
    }),
    translations: many(translations),
  })
);

export const translationsRelations = relations(translations, ({ one }) => ({
  key: one(translationKeys, {
    fields: [translations.keyId],
    references: [translationKeys.id],
  }),
}));

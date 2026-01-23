import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),

  // Authentication routes
  route("auth/login", "routes/auth.login.tsx"),
  route("auth/callback", "routes/auth.callback.tsx"),
  route("auth/logout", "routes/auth.logout.tsx"),
  route("auth/debug", "routes/auth.debug.tsx"),

  // Organizations routes
  route("orgs", "routes/orgs._index.tsx"),
  route("orgs/new", "routes/orgs.new.tsx"),
  route("orgs/:orgSlug", "routes/orgs.$orgSlug._index.tsx"),

  // Projects routes
  route("orgs/:orgSlug/projects/new", "routes/orgs.$orgSlug.projects.new.tsx"),
  route("orgs/:orgSlug/projects/:projectSlug", "routes/orgs.$orgSlug.projects.$projectSlug._index.tsx"),

  // Translation keys routes
  route("orgs/:orgSlug/projects/:projectSlug/keys", "routes/orgs.$orgSlug.projects.$projectSlug.keys._index.tsx"),
  route("orgs/:orgSlug/projects/:projectSlug/keys/new", "routes/orgs.$orgSlug.projects.$projectSlug.keys.new.tsx"),
  route("orgs/:orgSlug/projects/:projectSlug/keys/:keyId", "routes/orgs.$orgSlug.projects.$projectSlug.keys.$keyId.tsx"),

  // Search
  route("search", "routes/search.tsx"),

  // API routes
  route("api/orgs/:orgSlug/projects/:projectSlug/export", "routes/api.orgs.$orgSlug.projects.$projectSlug.export.tsx"),
] satisfies RouteConfig;

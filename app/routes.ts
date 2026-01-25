import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),

  // Authentication routes
  route("auth/login", "routes/auth.login.tsx"),
  route("auth/google/login", "routes/auth.google.login.tsx"),
  route("auth/google/callback", "routes/auth.google.callback.tsx"),
  route("auth/mapado/login", "routes/auth.mapado.login.tsx"),
  route("auth/mapado/callback", "routes/auth.mapado.callback.tsx"),
  route("auth/logout", "routes/auth.logout.tsx"),
  route("auth/debug", "routes/auth.debug.tsx"),
  route("auth/complete-profile", "routes/auth.complete-profile.tsx"),

  // Organizations routes
  route("orgs", "routes/orgs._index.tsx"),
  route("orgs/new", "routes/orgs.new.tsx"),
  route("orgs/:orgSlug", "routes/orgs.$orgSlug.tsx", [
    index("routes/orgs.$orgSlug._index.tsx"),
    route("members", "routes/orgs.$orgSlug.members.tsx"),
    route("settings", "routes/orgs.$orgSlug.settings.tsx"),
  ]),

  // Projects routes
  route("orgs/:orgSlug/projects/new", "routes/orgs.$orgSlug.projects.new.tsx"),
  route(
    "orgs/:orgSlug/projects/:projectSlug",
    "routes/orgs.$orgSlug.projects.$projectSlug.tsx",
    [
      index("routes/orgs.$orgSlug.projects.$projectSlug._index.tsx"),
      route(
        "translations",
        "routes/orgs.$orgSlug.projects.$projectSlug.translations.tsx",
      ),
      route(
        "settings",
        "routes/orgs.$orgSlug.projects.$projectSlug.settings.tsx",
      ),
      route(
        "import-export",
        "routes/orgs.$orgSlug.projects.$projectSlug.import-export.tsx",
      ),
    ],
  ),

  // Translation keys routes
  route(
    "orgs/:orgSlug/projects/:projectSlug/keys/new",
    "routes/orgs.$orgSlug.projects.$projectSlug.keys.new.tsx",
  ),
  route(
    "orgs/:orgSlug/projects/:projectSlug/keys/:keyId",
    "routes/orgs.$orgSlug.projects.$projectSlug.keys.$keyId.tsx",
  ),

  // Search
  route("search", "routes/search.tsx"),

  // API routes
  route(
    "api/orgs/:orgSlug/projects/:projectSlug/export",
    "routes/api.orgs.$orgSlug.projects.$projectSlug.export.tsx",
  ),
] satisfies RouteConfig;

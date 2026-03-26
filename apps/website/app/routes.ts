import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  // Public routes (no auth required)
  index("routes/_index.tsx"),
  route("pricing", "routes/pricing.tsx"),

  // Authentication routes (no auth required)
  route("auth/login", "routes/auth.login.tsx"),
  route("auth/google/login", "routes/auth.google.login.tsx"),
  route("auth/google/callback", "routes/auth.google.callback.tsx"),
  route("auth/github/login", "routes/auth.github.login.tsx"),
  route("auth/github/callback", "routes/auth.github.callback.tsx"),
  route("auth/mapado/login", "routes/auth.mapado.login.tsx"),
  route("auth/mapado/callback", "routes/auth.mapado.callback.tsx"),
  route("auth/logout", "routes/auth.logout.tsx"),

  // Invitation route (custom auth handling: shows login prompt if not authenticated)
  route("orgs/invite/:code", "routes/orgs.invite.$code.tsx"),

  // Public API routes (no auth required)
  route("api/locales/:lng/:ns", "routes/api.locales.$lng.$ns.ts"),
  route("api/doc.json", "routes/api.doc.json.tsx"),
  route("api/doc/viewer", "routes/api.doc.viewer.tsx"),
  route("api/doc", "routes/api.doc.tsx"),

  // Authenticated app routes (session auth via middleware)
  layout("routes/app-layout.tsx", [
    route("auth/complete-profile", "routes/auth.complete-profile.tsx"),

    // Organizations routes
    route("orgs", "routes/orgs._index.tsx"),
    route("orgs/new", "routes/orgs.new.tsx"),
    route("orgs/:orgSlug", "routes/orgs.$orgSlug.tsx", [
      index("routes/orgs.$orgSlug._index.tsx"),
      route("members", "routes/orgs.$orgSlug.members/index.tsx"),
      route("settings", "routes/orgs.$orgSlug.settings/index.tsx"),
    ]),

    // Projects routes
    route(
      "orgs/:orgSlug/projects/new",
      "routes/orgs.$orgSlug.projects.new.tsx",
    ),
    route(
      "orgs/:orgSlug/projects/:projectSlug",
      "routes/orgs.$orgSlug.projects.$projectSlug.tsx",
      [
        index("routes/orgs.$orgSlug.projects.$projectSlug._index.tsx"),
        route(
          "translations",
          "routes/orgs.$orgSlug.projects.$projectSlug.translations/index.tsx",
        ),
        route(
          "settings",
          "routes/orgs.$orgSlug.projects.$projectSlug.settings.tsx",
        ),
        route(
          "import-export",
          "routes/orgs.$orgSlug.projects.$projectSlug.import-export/index.tsx",
        ),
      ],
    ),

    // Branches routes
    route(
      "orgs/:orgSlug/projects/:projectSlug/branches",
      "routes/orgs.$orgSlug.projects.$projectSlug.branches._index.tsx",
    ),
    route(
      "orgs/:orgSlug/projects/:projectSlug/branches/new",
      "routes/orgs.$orgSlug.projects.$projectSlug.branches.new.tsx",
    ),
    route(
      "orgs/:orgSlug/projects/:projectSlug/branches/:branchSlug",
      "routes/orgs.$orgSlug.projects.$projectSlug.branches.$branchSlug.tsx",
    ),
    route(
      "orgs/:orgSlug/projects/:projectSlug/branches/:branchSlug/merge",
      "routes/orgs.$orgSlug.projects.$projectSlug.branches.$branchSlug.merge.tsx",
    ),

    // Translation keys routes
    route(
      "orgs/:orgSlug/projects/:projectSlug/keys/:keyId",
      "routes/orgs.$orgSlug.projects.$projectSlug.keys.$keyId.tsx",
    ),

    // Search
    route("search", "routes/search.tsx"),
  ]),

  // Authenticated API routes (dual auth: API key or session via middleware)
  layout("routes/api-layout.tsx", [
    route("api/orgs/:orgSlug", "routes/api-org-layout.tsx", [
      route(
        "projects/:projectSlug/translations",
        "routes/api.orgs.$orgSlug.projects.$projectSlug.translations.tsx",
      ),
      route(
        "projects/:projectSlug/translate",
        "routes/api.orgs.$orgSlug.projects.$projectSlug.translate.tsx",
      ),
    ]),
  ]),
] satisfies RouteConfig;

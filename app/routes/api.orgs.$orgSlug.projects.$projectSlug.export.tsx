import { requireUser } from "~/lib/session.server";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import { getProjectBySlug, getProjectLanguages } from "~/lib/projects.server";
import { getProjectTranslations } from "~/lib/translation-keys.server";
import {
  exportToJSON,
  exportAllLanguagesToJSON,
} from "~/lib/export/json.server";
import { exportToXLIFF } from "~/lib/export/xliff.server";
import {
  getOrganizationByApiKey,
  updateApiKeyLastUsed,
} from "~/lib/api-keys.server";
import type { Route } from "./+types/api.orgs.$orgSlug.projects.$projectSlug.export";

export async function loader({ request, params }: Route.LoaderArgs) {
  // Vérifier le header Authorization pour authentification par clé d'API
  const authHeader = request.headers.get("Authorization");
  let organization;

  if (authHeader?.startsWith("Bearer ")) {
    // Mode API Key : authentification par clé d'API
    const apiKey = authHeader.slice(7); // Retire "Bearer "

    // Vérifier la clé et récupérer l'organisation
    const org = await getOrganizationByApiKey(apiKey);

    if (!org) {
      return new Response(JSON.stringify({ error: "Invalid API key" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Vérifier que l'organisation correspond au slug
    if (org.slug !== params.orgSlug) {
      return new Response(
        JSON.stringify({
          error: "API key does not match organization",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Mettre à jour la date de dernière utilisation (async, sans attendre)
    updateApiKeyLastUsed(apiKey).catch((err) => {
      console.error("Failed to update API key last used:", err);
    });

    organization = org;
  } else {
    // Mode session : authentification par session utilisateur (comportement actuel)
    const user = await requireUser(request);
    organization = await requireOrganizationMembership(user, params.orgSlug);
  }

  const project = await getProjectBySlug(organization.id, params.projectSlug);

  if (!project) {
    throw new Response("Project not found", { status: 404 });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format") || "json";
  const locale = url.searchParams.get("locale");
  const sourceLocale = url.searchParams.get("source");
  const targetLocale = url.searchParams.get("target");
  const exportAll = url.searchParams.has("all");

  // Récupérer les langues du projet
  const languages = await getProjectLanguages(project.id);

  if (languages.length === 0) {
    return new Response(
      JSON.stringify({ error: "No languages configured for this project" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Récupérer toutes les traductions du projet
  const projectTranslations = await getProjectTranslations(project.id);

  if (format === "json") {
    let content: string;
    let filename: string;

    if (exportAll) {
      // Exporter toutes les langues
      const locales = languages.map((l) => l.locale);
      content = exportAllLanguagesToJSON(projectTranslations, locales);
      filename = `${project.slug}-all.json`;
    } else {
      // Exporter une seule langue
      if (!locale) {
        return new Response(
          JSON.stringify({
            error:
              "Missing 'locale' parameter. Use ?format=json&locale=fr or ?format=json&all",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Vérifier que la langue existe dans le projet
      if (!languages.some((l) => l.locale === locale)) {
        return new Response(
          JSON.stringify({
            error: `Language '${locale}' not found in this project`,
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      content = exportToJSON(projectTranslations, locale);
      filename = `${project.slug}-${locale}.json`;
    }

    return new Response(content, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  if (format === "xliff") {
    if (!sourceLocale || !targetLocale) {
      return new Response(
        JSON.stringify({
          error:
            "Missing 'source' and 'target' parameters. Use ?format=xliff&source=en&target=fr",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Vérifier que les langues existent dans le projet
    if (!languages.some((l) => l.locale === sourceLocale)) {
      return new Response(
        JSON.stringify({
          error: `Source language '${sourceLocale}' not found in this project`,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (!languages.some((l) => l.locale === targetLocale)) {
      return new Response(
        JSON.stringify({
          error: `Target language '${targetLocale}' not found in this project`,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const content = exportToXLIFF(
      projectTranslations,
      sourceLocale,
      targetLocale,
      project.name,
    );

    const filename = `${project.slug}-${sourceLocale}-${targetLocale}.xliff`;

    return new Response(content, {
      headers: {
        "Content-Type": "application/x-xliff+xml",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  return new Response(
    JSON.stringify({
      error: "Invalid format. Use 'json' or 'xliff'",
    }),
    {
      status: 400,
      headers: { "Content-Type": "application/json" },
    },
  );
}

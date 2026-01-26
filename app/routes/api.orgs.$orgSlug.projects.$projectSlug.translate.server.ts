import { requireUser } from "~/lib/session.server";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import { getProjectBySlug, getProjectLanguages } from "~/lib/projects.server";
import {
  getTranslationKeyById,
  getTranslationsForKey,
} from "~/lib/translation-keys.server";
import { getActiveAiProvider } from "~/lib/ai-providers.server";
import { translateWithAI } from "~/lib/ai-translation.server";

interface ActionArgs {
  request: Request;
  params: {
    orgSlug: string;
    projectSlug: string;
  };
}

export async function action({ request, params }: ActionArgs) {
  const { orgSlug, projectSlug } = params;

  if (!orgSlug || !projectSlug) {
    return Response.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const user = await requireUser(request);
  const organization = await requireOrganizationMembership(user, orgSlug);

  const project = await getProjectBySlug(organization.id, projectSlug);

  if (!project) {
    return Response.json({ error: "Projet non trouvé" }, { status: 404 });
  }

  const formData = await request.formData();
  const keyId = formData.get("keyId") as string;
  const targetLocale = formData.get("targetLocale") as string;

  if (!keyId || !targetLocale) {
    return Response.json(
      { error: "keyId et targetLocale requis" },
      { status: 400 },
    );
  }

  const key = await getTranslationKeyById(parseInt(keyId, 10));

  if (!key || key.projectId !== project.id) {
    return Response.json({ error: "Clé non trouvée" }, { status: 404 });
  }

  // Récupérer le provider IA actif
  const activeProvider = await getActiveAiProvider(organization.id);

  if (!activeProvider) {
    return Response.json(
      {
        error:
          "Aucun service IA configuré. Configurez-le dans les paramètres de l'organisation.",
      },
      { status: 400 },
    );
  }

  // Récupérer les traductions existantes et les langues
  const translations = await getTranslationsForKey(key.id);
  const languages = await getProjectLanguages(project.id);
  const defaultLang = languages.find((l) => l.isDefault);

  // Trouver le texte source (langue par défaut ou première langue disponible)
  const sourceTranslation =
    translations.find((t) => t.locale === defaultLang?.locale) ||
    translations[0];

  if (!sourceTranslation) {
    return Response.json(
      { error: "Aucune traduction source disponible" },
      { status: 400 },
    );
  }

  try {
    const suggestions = await translateWithAI(
      {
        sourceText: sourceTranslation.value,
        sourceLocale: sourceTranslation.locale,
        targetLocale,
        existingTranslations: translations
          .filter((t) => t.locale !== targetLocale)
          .map((t) => ({ locale: t.locale, value: t.value })),
        keyDescription: key.description ?? undefined,
      },
      activeProvider.provider,
      activeProvider.apiKey,
    );

    return Response.json({ suggestions, provider: activeProvider.provider });
  } catch (error) {
    console.error("Erreur lors de la traduction IA:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de la traduction",
      },
      { status: 500 },
    );
  }
}

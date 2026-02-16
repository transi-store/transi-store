import type { Route } from "./+types/api.orgs.$orgSlug.projects.$projectSlug.translate";
import { requireUser } from "~/lib/session.server";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import { getProjectBySlug, getProjectLanguages } from "~/lib/projects.server";
import {
  getTranslationKeyById,
  getTranslationsForKey,
} from "~/lib/translation-keys.server";
import { getActiveAiProvider } from "~/lib/ai-providers.server";
import {
  translateWithAI,
  type TranslationSuggestion,
} from "~/lib/ai-translation.server";
import { getInstance } from "~/middleware/i18next";
import type { AiProviderEnum } from "~/lib/ai-providers";

type SuggestionsReturnType = {
  suggestions?: Array<TranslationSuggestion>;
  provider?: AiProviderEnum;
};

type ErrorReturnType = {
  error: string;
};

export function isSuggestionsReturnType(
  data: TranslateAction | undefined,
): data is SuggestionsReturnType {
  return !!data && (data as SuggestionsReturnType).suggestions !== undefined;
}

export function isErrorReturnType(
  data: TranslateAction | undefined,
): data is ErrorReturnType {
  return !!data && (data as ErrorReturnType).error !== undefined;
}

export type TranslateAction = SuggestionsReturnType | ErrorReturnType;

export async function action({
  request,
  params,
  context,
}: Route.ActionArgs): Promise<TranslateAction | Response> {
  const i18next = getInstance(context);
  const { orgSlug, projectSlug } = params;

  if (!orgSlug || !projectSlug) {
    return Response.json(
      {
        error: i18next.t("api.translate.paramsMissing"),
      },
      { status: 400 },
    );
  }

  const user = await requireUser(request);
  const organization = await requireOrganizationMembership(user, orgSlug);

  const project = await getProjectBySlug(organization.id, projectSlug);

  if (!project) {
    return Response.json(
      { error: i18next.t("api.translate.projectNotFound") },
      { status: 404 },
    );
  }

  const formData = await request.formData();
  const keyId = formData.get("keyId") as string;
  const targetLocale = formData.get("targetLocale") as string;

  if (!keyId || !targetLocale) {
    return Response.json(
      {
        error: i18next.t("api.translate.missingParams"),
      },
      { status: 400 },
    );
  }

  const key = await getTranslationKeyById(parseInt(keyId, 10));

  if (!key || key.projectId !== project.id) {
    return Response.json(
      { error: i18next.t("api.translate.keyNotFound") },
      { status: 404 },
    );
  }

  // Récupérer le provider IA actif
  const activeProvider = await getActiveAiProvider(organization.id);

  if (!activeProvider) {
    return Response.json(
      {
        error: i18next.t("api.translate.noAiProvider"),
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
      {
        error: i18next.t("api.translate.noSourceTranslation"),
      },
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
        error: i18next.t("api.translate.translateError"),
      },
      { status: 500 },
    );
  }
}

// Resource route - ce composant n'est jamais rendu car l'action retourne toujours une Response
export default function TranslateRoute() {
  return null;
}

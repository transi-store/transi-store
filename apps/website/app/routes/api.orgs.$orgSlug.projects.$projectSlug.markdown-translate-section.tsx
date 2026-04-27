/**
 * AI translate endpoint for markdown / MDX documents.
 *
 * Two scopes are supported:
 *
 * - `scope=section`: re-uses `translateWithAI` with `format=markdown|mdx`,
 *   returns 2–3 ranked `TranslationSuggestion`s — same shape as the ICU
 *   translate endpoint, so the UI can display a suggestion picker.
 * - `scope=document`: uses `translateMarkdownWithAI` and returns a single
 *   `translatedText` (multi-suggestion on a whole document is rarely useful
 *   and expensive).
 *
 * Both scopes accept an optional `targetCurrentText` field — the current
 * target-locale draft, sent to the AI as a tone/terminology reference.
 */
import type { Route } from "./+types/api.orgs.$orgSlug.projects.$projectSlug.markdown-translate-section";
import { z } from "zod";
import { getProjectBySlug } from "~/lib/projects.server";
import { getProjectFileById } from "~/lib/project-files.server";
import { getActiveAiProvider } from "~/lib/ai-providers.server";
import {
  translateMarkdownWithAI,
  translateWithAI,
  type TranslationSuggestion,
} from "~/lib/ai-translation.server";
import {
  recordAiTranslation,
  MarkdownTranslationMissingError,
} from "~/lib/markdown-documents.server";
import { getInstance } from "~/middleware/i18next";
import { orgContext } from "~/middleware/api-auth";
import { SupportedFormat, isDocumentFormat } from "@transi-store/common";
import type { AiProviderEnum } from "~/lib/ai-providers";

const requestSchema = z.object({
  sourceLocale: z.string().min(2),
  targetLocale: z.string().min(2),
  sourceText: z.string(),
  fileId: z.coerce.number().int().positive(),
  structuralPath: z.string().optional(),
  scope: z.enum(["section", "document"]),
  targetCurrentText: z.string().optional(),
});

type SectionSuccessReturn = {
  scope: "section";
  suggestions: TranslationSuggestion[];
  provider: AiProviderEnum;
  providerModel: string | null | undefined;
};

type DocumentSuccessReturn = {
  scope: "document";
  translatedText: string;
};

type ErrorReturn = {
  error: string;
  originalError?: string;
};

export type MarkdownTranslateSectionAction =
  | SectionSuccessReturn
  | DocumentSuccessReturn
  | ErrorReturn;

export function isMarkdownSectionSuccess(
  data: MarkdownTranslateSectionAction | undefined,
): data is SectionSuccessReturn {
  return !!data && (data as SectionSuccessReturn).scope === "section";
}

export function isMarkdownDocumentSuccess(
  data: MarkdownTranslateSectionAction | undefined,
): data is DocumentSuccessReturn {
  return !!data && (data as DocumentSuccessReturn).scope === "document";
}

export function isMarkdownTranslateError(
  data: MarkdownTranslateSectionAction | undefined,
): data is ErrorReturn {
  return !!data && (data as ErrorReturn).error !== undefined;
}

export async function action({
  params,
  request,
  context,
}: Route.ActionArgs): Promise<Response> {
  const i18next = getInstance(context);
  const organization = context.get(orgContext);

  const project = await getProjectBySlug(organization.id, params.projectSlug);
  if (!project) {
    return Response.json(
      { error: i18next.t("api.translate.projectNotFound") },
      { status: 404 },
    );
  }

  const formData = await request.formData();
  const parsed = requestSchema.safeParse({
    sourceLocale: formData.get("sourceLocale"),
    targetLocale: formData.get("targetLocale"),
    sourceText: formData.get("sourceText"),
    fileId: formData.get("fileId"),
    structuralPath: formData.get("structuralPath") ?? undefined,
    scope: formData.get("scope"),
    targetCurrentText: formData.get("targetCurrentText") ?? undefined,
  });
  if (!parsed.success) {
    return Response.json(
      {
        error: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const projectFile = await getProjectFileById(project.id, data.fileId);
  if (!projectFile) {
    return Response.json(
      {
        error: i18next.t("files.errors.fileNotFound", {
          fileId: String(data.fileId),
          projectSlug: params.projectSlug,
        }),
      },
      { status: 404 },
    );
  }

  if (!isDocumentFormat(projectFile.format)) {
    return Response.json(
      { error: i18next.t("markdownTranslate.errors.notDocumentFormat") },
      { status: 400 },
    );
  }

  const activeProvider = await getActiveAiProvider(organization.id);
  if (!activeProvider) {
    return Response.json(
      { error: i18next.t("api.translate.noAiProvider") },
      { status: 400 },
    );
  }

  if (data.sourceText.trim().length === 0) {
    return Response.json(
      { error: i18next.t("markdownTranslate.errors.emptySource") },
      { status: 400 },
    );
  }

  const isMdx = projectFile.format === SupportedFormat.MDX;

  try {
    if (data.scope === "section") {
      const suggestions = await translateWithAI(
        {
          sourceText: data.sourceText,
          sourceLocale: data.sourceLocale,
          targetLocale: data.targetLocale,
          existingTranslations: [],
          format: isMdx ? "mdx" : "markdown",
          targetCurrentText: data.targetCurrentText,
        },
        activeProvider,
      );

      if (data.structuralPath) {
        try {
          await recordAiTranslation({
            projectFileId: projectFile.id,
            locale: data.targetLocale,
            structuralPath: data.structuralPath,
          });
        } catch (error) {
          // No-op: if the target translation row doesn't exist yet (the
          // user hasn't saved a draft of that locale), we just skip the
          // metadata update — the suggestions were still produced.
          if (!(error instanceof MarkdownTranslationMissingError)) throw error;
        }
      }

      return Response.json({
        scope: "section",
        suggestions,
        provider: activeProvider.provider,
        providerModel: activeProvider.model,
      } satisfies SectionSuccessReturn);
    }

    const translatedText = await translateMarkdownWithAI(
      {
        sourceText: data.sourceText,
        sourceLocale: data.sourceLocale,
        targetLocale: data.targetLocale,
        isMdx,
        targetCurrentText: data.targetCurrentText,
      },
      activeProvider,
    );

    return Response.json({
      scope: "document",
      translatedText,
    } satisfies DocumentSuccessReturn);
  } catch (error) {
    console.error("Markdown AI translation failed:", error);
    return Response.json(
      {
        error: i18next.t("api.translate.translateError"),
        originalError: error instanceof Error ? error.message : undefined,
      } satisfies ErrorReturn,
      { status: 500 },
    );
  }
}

export default function MarkdownTranslateSectionRoute() {
  return null;
}

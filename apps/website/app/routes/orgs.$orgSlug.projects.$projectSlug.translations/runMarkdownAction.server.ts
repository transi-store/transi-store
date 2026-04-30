import { SupportedFormat, isDocumentFormat } from "@transi-store/common";
import type { i18n } from "i18next";
import {
  MarkdownDocumentConflictError,
  MarkdownTranslationMissingError,
  recordAiTranslation,
  saveDocumentTranslation,
  setSectionFuzzy,
} from "~/lib/markdown-documents.server";
import { getProjectFileById } from "~/lib/project-files.server";
import { getActiveAiProvider } from "~/lib/ai-providers.server";
import {
  translateMarkdownWithAI,
  translateWithAI,
} from "~/lib/ai-translation.server";
import {
  MarkdownTranslateAction,
  type MarkdownAiResponse,
} from "~/components/markdown-translate/MarkdownTranslateAction";

type MarkdownActionValue =
  (typeof MarkdownTranslateAction)[keyof typeof MarkdownTranslateAction];

export function isMarkdownAction(value: unknown): value is MarkdownActionValue {
  return (
    typeof value === "string" &&
    Object.values(MarkdownTranslateAction)
      // @ts-expect-error the purpose of this function is to check if a string is a valid MarkdownActionValue, so we need to ignore the type error here
      .includes(value)
  );
}

function jsonError(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function runMarkdownAction(args: {
  action: MarkdownActionValue;
  formData: FormData;
  projectId: number;
  organizationId: number;
  projectSlug: string;
  i18next: i18n;
}): Promise<Response> {
  const { action, formData, projectId, organizationId, projectSlug, i18next } =
    args;

  const fileIdRaw = formData.get("fileId");
  const fileId = typeof fileIdRaw === "string" ? parseInt(fileIdRaw, 10) : NaN;
  if (isNaN(fileId)) {
    return jsonError(400, i18next.t("files.errors.missingFileId"));
  }

  const projectFile = await getProjectFileById(projectId, fileId);
  if (!projectFile) {
    return jsonError(
      404,
      i18next.t("files.errors.fileNotFound", {
        fileId: String(fileId),
        projectSlug,
      }),
    );
  }

  if (!isDocumentFormat(projectFile.format)) {
    return jsonError(
      400,
      i18next.t("markdownTranslate.errors.notDocumentFormat"),
    );
  }

  if (action === MarkdownTranslateAction.SaveContent) {
    const locale = formData.get("locale");
    const content = formData.get("content");
    const expectedUpdatedAtRaw = formData.get("expectedUpdatedAt");
    if (typeof locale !== "string" || typeof content !== "string") {
      return jsonError(
        400,
        i18next.t("markdownTranslate.errors.missingPayload"),
      );
    }
    const expectedUpdatedAt =
      typeof expectedUpdatedAtRaw === "string" &&
      expectedUpdatedAtRaw.length > 0
        ? new Date(expectedUpdatedAtRaw)
        : undefined;
    try {
      const { translation } = await saveDocumentTranslation({
        projectFileId: projectFile.id,
        locale,
        content,
        format: projectFile.format as SupportedFormat,
        expectedUpdatedAt,
      });
      return Response.json({
        ok: true,
        locale,
        updatedAt: translation.updatedAt.toISOString(),
      });
    } catch (error) {
      if (error instanceof MarkdownDocumentConflictError) {
        return Response.json(
          {
            error: i18next.t("markdownTranslate.errors.conflict"),
            conflict: true,
          },
          { status: 409 },
        );
      }
      throw error;
    }
  }

  if (
    action === MarkdownTranslateAction.TranslateSection ||
    action === MarkdownTranslateAction.TranslateDocument
  ) {
    const sourceLocale = formData.get("sourceLocale");
    const targetLocale = formData.get("targetLocale");
    const sourceText = formData.get("sourceText");
    const structuralPath = formData.get("structuralPath");
    const targetCurrentText = formData.get("targetCurrentText");
    if (
      typeof sourceLocale !== "string" ||
      typeof targetLocale !== "string" ||
      typeof sourceText !== "string"
    ) {
      return jsonError(
        400,
        i18next.t("markdownTranslate.errors.missingPayload"),
      );
    }

    const activeProvider = await getActiveAiProvider(organizationId);
    if (!activeProvider) {
      return Response.json(
        {
          error: i18next.t("api.translate.noAiProvider"),
        } satisfies MarkdownAiResponse,
        { status: 400 },
      );
    }

    if (sourceText.trim().length === 0) {
      return Response.json(
        {
          error: i18next.t("markdownTranslate.errors.emptySource"),
        } satisfies MarkdownAiResponse,
        { status: 400 },
      );
    }

    const isMdx = projectFile.format === SupportedFormat.MDX;
    const targetCurrent =
      typeof targetCurrentText === "string" ? targetCurrentText : undefined;

    try {
      if (action === MarkdownTranslateAction.TranslateSection) {
        const suggestions = await translateWithAI(
          {
            sourceText,
            sourceLocale,
            targetLocale,
            existingTranslations: [],
            format: isMdx ? "mdx" : "markdown",
            targetCurrentText: targetCurrent,
          },
          activeProvider,
        );

        if (typeof structuralPath === "string" && structuralPath.length > 0) {
          try {
            await recordAiTranslation({
              projectFileId: projectFile.id,
              locale: targetLocale,
              structuralPath,
            });
          } catch (error) {
            if (!(error instanceof MarkdownTranslationMissingError))
              throw error;
          }
        }

        return Response.json({
          scope: "section",
          suggestions,
          provider: activeProvider.provider,
          providerModel: activeProvider.model,
        } satisfies MarkdownAiResponse);
      }

      const translatedText = await translateMarkdownWithAI(
        {
          sourceText,
          sourceLocale,
          targetLocale,
          isMdx,
          targetCurrentText: targetCurrent,
        },
        activeProvider,
      );
      return Response.json({
        scope: "document",
        translatedText,
      } satisfies MarkdownAiResponse);
    } catch (error) {
      console.error("Markdown AI translation failed:", error);
      return Response.json(
        {
          error: i18next.t("api.translate.translateError"),
          originalError: error instanceof Error ? error.message : undefined,
        } satisfies MarkdownAiResponse,
        { status: 500 },
      );
    }
  }

  // ToggleFuzzy
  const locale = formData.get("locale");
  const structuralPath = formData.get("structuralPath");
  const isFuzzyRaw = formData.get("isFuzzy");
  if (
    typeof locale !== "string" ||
    typeof structuralPath !== "string" ||
    typeof isFuzzyRaw !== "string"
  ) {
    return jsonError(400, i18next.t("markdownTranslate.errors.missingPayload"));
  }
  try {
    await setSectionFuzzy({
      projectFileId: projectFile.id,
      locale,
      structuralPath,
      isFuzzy: isFuzzyRaw === "true",
    });
  } catch (error) {
    if (error instanceof MarkdownTranslationMissingError) {
      return jsonError(
        409,
        i18next.t("markdownTranslate.errors.translationMissing"),
      );
    }
    throw error;
  }
  return Response.json({ ok: true });
}

/**
 * Full-width markdown / MDX translation page. Loads the document content per
 * locale + sidecar fuzzy flags, then renders two CodeMirror editors with a
 * center action bar for copy/AI/fuzzy controls.
 *
 * Triggered when the user navigates to `/orgs/:orgSlug/projects/:projectSlug
 * /translations/markdown?fileId=<id>`. The classic translations route auto-
 * redirects here when the selected file's format is markdown / mdx.
 */
import { useMemo } from "react";
import {
  Box,
  Heading,
  HStack,
  Stack,
  Text,
  Code,
  Button,
} from "@chakra-ui/react";
import { Link, redirect, useOutletContext } from "react-router";
import { useTranslation } from "react-i18next";
import { LuArrowLeft } from "react-icons/lu";
import { SupportedFormat, isDocumentFormat } from "@transi-store/common";
import type { Route } from "./+types/index";
import { userContext } from "~/middleware/auth";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import { getProjectBySlug, getProjectLanguages } from "~/lib/projects.server";
import {
  getProjectFiles,
  getProjectFileById,
} from "~/lib/project-files.server";
import {
  getProjectFileTranslations,
  getSectionStatesForTranslations,
  saveDocumentTranslation,
  setSectionFuzzy,
  recordAiTranslation,
  MarkdownDocumentConflictError,
  MarkdownTranslationMissingError,
} from "~/lib/markdown-documents.server";
import { getActiveAiProvider } from "~/lib/ai-providers.server";
import {
  translateMarkdownWithAI,
  translateWithAI,
} from "~/lib/ai-translation.server";
import { getInstance } from "~/middleware/i18next";
import { getTranslationsUrl } from "~/lib/routes-helpers";
import { createProjectNotFoundResponse } from "~/errors/response-errors/ProjectNotFoundResponse";
import { MarkdownTranslateLayout } from "~/components/markdown-translate/MarkdownTranslateLayout";
import {
  MarkdownTranslateAction,
  type MarkdownAiResponse,
} from "~/components/markdown-translate/MarkdownTranslateAction";

type ContextType = {
  organization: { id: string; slug: string; name: string };
  project: { id: string; slug: string; name: string };
  languages: Array<{ id: string; locale: string; isDefault: boolean }>;
};

function jsonError(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const i18next = getInstance(context);
  const user = context.get(userContext);
  const organization = await requireOrganizationMembership(
    user,
    params.orgSlug,
  );

  const project = await getProjectBySlug(organization.id, params.projectSlug);
  if (!project) {
    throw createProjectNotFoundResponse(params.projectSlug);
  }

  const url = new URL(request.url);
  const fileIdParam = url.searchParams.get("fileId");
  const parsedFileId = fileIdParam ? parseInt(fileIdParam, 10) : NaN;

  const files = await getProjectFiles(project.id);
  const documentFiles = files.filter((f) => isDocumentFormat(f.format));

  if (documentFiles.length === 0) {
    throw redirect(getTranslationsUrl(params.orgSlug, params.projectSlug));
  }

  const selectedFile = !isNaN(parsedFileId)
    ? documentFiles.find((f) => f.id === parsedFileId)
    : undefined;

  if (!selectedFile) {
    throw redirect(
      `/orgs/${params.orgSlug}/projects/${params.projectSlug}/translations/markdown?fileId=${documentFiles[0].id}`,
    );
  }

  const languages = await getProjectLanguages(project.id);
  if (languages.length < 2) {
    return {
      file: selectedFile,
      documentFiles,
      languages,
      tooFewLanguages: true,
      contentByLocale: {} as Record<string, string>,
      fuzzyByLocale: {} as Record<string, Record<string, boolean>>,
    };
  }

  const translations = await getProjectFileTranslations(selectedFile.id);
  const sectionStates = await getSectionStatesForTranslations(
    translations.map((t) => t.id),
  );

  const contentByLocale: Record<string, string> = {};
  for (const lang of languages) {
    contentByLocale[lang.locale] = "";
  }
  for (const tr of translations) {
    contentByLocale[tr.locale] = tr.content;
  }

  // Map translation row id → locale to attribute section states to a locale.
  const localeByTranslationId = new Map<number, string>();
  for (const tr of translations) {
    localeByTranslationId.set(tr.id, tr.locale);
  }

  const fuzzyByLocale: Record<string, Record<string, boolean>> = {};
  for (const lang of languages) {
    fuzzyByLocale[lang.locale] = {};
  }
  for (const state of sectionStates) {
    const locale = localeByTranslationId.get(state.documentTranslationId);
    if (!locale) continue;
    if (!fuzzyByLocale[locale]) fuzzyByLocale[locale] = {};
    fuzzyByLocale[locale][state.structuralPath] = state.isFuzzy;
  }

  void i18next; // i18next instance available if we need server-side strings later

  return {
    file: selectedFile,
    documentFiles,
    languages,
    tooFewLanguages: false,
    contentByLocale,
    fuzzyByLocale,
  };
}

export async function action({ request, params, context }: Route.ActionArgs) {
  const i18next = getInstance(context);
  const user = context.get(userContext);
  const organization = await requireOrganizationMembership(
    user,
    params.orgSlug,
  );

  const project = await getProjectBySlug(organization.id, params.projectSlug);
  if (!project) {
    throw createProjectNotFoundResponse(params.projectSlug);
  }

  const formData = await request.formData();
  const action = formData.get("_action");
  const fileIdRaw = formData.get("fileId");
  const fileId = typeof fileIdRaw === "string" ? parseInt(fileIdRaw, 10) : NaN;
  if (isNaN(fileId)) {
    return jsonError(400, i18next.t("files.errors.missingFileId"));
  }

  const projectFile = await getProjectFileById(project.id, fileId);
  if (!projectFile) {
    return jsonError(
      404,
      i18next.t("files.errors.fileNotFound", {
        fileId: String(fileId),
        projectSlug: params.projectSlug,
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

    const activeProvider = await getActiveAiProvider(organization.id);
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
            // The target row may not exist yet (the user hasn't saved a
            // draft of that locale): skip metadata stamping silently.
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

  if (action === MarkdownTranslateAction.ToggleFuzzy) {
    const locale = formData.get("locale");
    const structuralPath = formData.get("structuralPath");
    const isFuzzyRaw = formData.get("isFuzzy");
    if (
      typeof locale !== "string" ||
      typeof structuralPath !== "string" ||
      typeof isFuzzyRaw !== "string"
    ) {
      return jsonError(
        400,
        i18next.t("markdownTranslate.errors.missingPayload"),
      );
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

  return jsonError(400, i18next.t("keys.errors.unknownAction"));
}

export default function MarkdownTranslate({
  loaderData,
}: Route.ComponentProps) {
  const { t } = useTranslation();
  const {
    organization,
    project,
    languages: ctxLanguages,
  } = useOutletContext<ContextType>();

  const {
    file,
    documentFiles,
    languages,
    tooFewLanguages,
    contentByLocale,
    fuzzyByLocale,
  } = loaderData;

  const isMdx = file.format === SupportedFormat.MDX;

  const initialLeftLocale = useMemo(() => {
    const def = languages.find((l) => l.isDefault);
    return def?.locale ?? languages[0]?.locale ?? "";
  }, [languages]);

  const initialRightLocale = useMemo(() => {
    const others = languages.filter((l) => l.locale !== initialLeftLocale);
    return others[0]?.locale ?? initialLeftLocale;
  }, [languages, initialLeftLocale]);

  void ctxLanguages;

  return (
    <Stack gap={4} h="full" w="full">
      <HStack justify="space-between" align="center" wrap="wrap" gap={2}>
        <Stack gap={1}>
          <HStack gap={2}>
            <Button
              asChild
              variant="ghost"
              size="xs"
              aria-label={t("markdownTranslate.backToTranslations")}
            >
              <Link
                to={getTranslationsUrl(organization.slug, project.slug, {
                  fileId: file.id,
                })}
              >
                <LuArrowLeft />
                {t("markdownTranslate.backToTranslations")}
              </Link>
            </Button>
          </HStack>
          <Heading as="h2" size="md">
            <Code fontSize="md">{file.filePath}</Code>
          </Heading>
          <Text fontSize="sm" color="fg.muted">
            {t("markdownTranslate.subtitle", { format: file.format })}
          </Text>
        </Stack>
        {documentFiles.length > 1 && (
          <HStack gap={2} wrap="wrap">
            {documentFiles.map((f) => (
              <Button
                key={f.id}
                size="xs"
                variant={f.id === file.id ? "solid" : "outline"}
                asChild
              >
                <Link
                  to={`/orgs/${organization.slug}/projects/${project.slug}/translations/markdown?fileId=${f.id}`}
                >
                  <Code fontSize="xs">{f.filePath}</Code>
                </Link>
              </Button>
            ))}
          </HStack>
        )}
      </HStack>

      {tooFewLanguages ? (
        <Box p={8} bg="bg.subtle" borderRadius="md" textAlign="center">
          <Text color="fg.muted" mb={3}>
            {t("markdownTranslate.errors.tooFewLanguages")}
          </Text>
          <Button asChild colorPalette="brand">
            <Link
              to={`/orgs/${organization.slug}/projects/${project.slug}/settings`}
            >
              {t("translations.manageLanguages")}
            </Link>
          </Button>
        </Box>
      ) : (
        <MarkdownTranslateLayout
          organizationSlug={organization.slug}
          projectSlug={project.slug}
          fileId={file.id}
          filePath={file.filePath}
          isMdx={isMdx}
          languages={languages.map((l) => ({
            locale: l.locale,
            isDefault: l.isDefault ?? false,
          }))}
          initialContent={contentByLocale}
          fuzzyByLocale={fuzzyByLocale}
          initialLeftLocale={initialLeftLocale}
          initialRightLocale={initialRightLocale}
        />
      )}
    </Stack>
  );
}

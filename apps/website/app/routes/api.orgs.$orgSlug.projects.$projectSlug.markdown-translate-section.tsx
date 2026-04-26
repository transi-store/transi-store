/**
 * AI translate endpoint for markdown / MDX documents.
 *
 * POST body (form-encoded):
 * - sourceLocale, targetLocale: ISO locale strings
 * - sourceText: markdown / MDX text to translate (a section, or the whole doc)
 * - fileId: id of the project file (used to resolve the document and update sidecar)
 * - structuralPath?: when scope=section, the structuralPath of the section being translated
 * - scope: "section" | "document"
 *
 * Reuses `translateMarkdownWithAI()` with a markdown-aware prompt that
 * preserves headings, code blocks, links, lists, and JSX (for MDX).
 */
import type { Route } from "./+types/api.orgs.$orgSlug.projects.$projectSlug.markdown-translate-section";
import { z } from "zod";
import { getProjectBySlug } from "~/lib/projects.server";
import { getProjectFileById } from "~/lib/project-files.server";
import { getActiveAiProvider } from "~/lib/ai-providers.server";
import { translateMarkdownWithAI } from "~/lib/ai-translation.server";
import {
  recordAiTranslation,
  MarkdownTranslationMissingError,
} from "~/lib/markdown-documents.server";
import { getInstance } from "~/middleware/i18next";
import { orgContext } from "~/middleware/api-auth";
import { SupportedFormat, isDocumentFormat } from "@transi-store/common";

const requestSchema = z.object({
  sourceLocale: z.string().min(2),
  targetLocale: z.string().min(2),
  sourceText: z.string(),
  fileId: z.coerce.number().int().positive(),
  structuralPath: z.string().optional(),
  scope: z.enum(["section", "document"]),
});

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

  try {
    const translatedText = await translateMarkdownWithAI(
      {
        sourceText: data.sourceText,
        sourceLocale: data.sourceLocale,
        targetLocale: data.targetLocale,
        isMdx: projectFile.format === SupportedFormat.MDX,
      },
      activeProvider,
    );

    if (data.scope === "section" && data.structuralPath) {
      try {
        await recordAiTranslation({
          projectFileId: projectFile.id,
          locale: data.targetLocale,
          structuralPath: data.structuralPath,
        });
      } catch (error) {
        // No-op: if the target translation row doesn't exist yet (the user
        // hasn't applied the AI suggestion to disk), we just skip the
        // metadata update — the translation was still produced.
        if (!(error instanceof MarkdownTranslationMissingError)) throw error;
      }
    }

    return Response.json({ translatedText });
  } catch (error) {
    console.error("Markdown AI translation failed:", error);
    return Response.json(
      {
        error: i18next.t("api.translate.translateError"),
        originalError: error instanceof Error ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}

export default function MarkdownTranslateSectionRoute() {
  return null;
}

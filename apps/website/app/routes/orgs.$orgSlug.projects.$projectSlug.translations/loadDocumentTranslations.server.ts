import { getProjectLanguages } from "~/lib/projects.server";
import {
  getProjectFileTranslations,
  getSectionStatesForTranslations,
} from "~/lib/markdown-documents.server";
import type { ProjectFile } from "../../../drizzle/schema";
import { DocumentMode } from "./constants";

export type DocumentTranslationsLoaderData = {
  mode: DocumentMode.Document;
  projectFiles: ProjectFile[];
  selectedFileId: number;
  markdownData: {
    contentByLocale: Record<string, string>;
    fuzzyByLocale: Record<string, Record<string, boolean>>;
    tooFewLanguages: boolean;
    languages: Array<{ id: string; locale: string; isDefault: boolean }>;
  };
};

export async function loadDocumentTranslations(args: {
  projectId: number;
  projectFiles: ProjectFile[];
  selectedFile: ProjectFile;
}): Promise<DocumentTranslationsLoaderData> {
  const { projectId, projectFiles, selectedFile } = args;
  const languages = await getProjectLanguages(projectId);
  const normalizedLanguages = languages.map((l) => ({
    id: String(l.id),
    locale: l.locale,
    isDefault: l.isDefault ?? false,
  }));

  const contentByLocale: Record<string, string> = {};
  const fuzzyByLocale: Record<string, Record<string, boolean>> = {};
  let tooFewLanguages = false;

  if (languages.length < 2) {
    tooFewLanguages = true;
  } else {
    const translations = await getProjectFileTranslations(selectedFile.id);
    const sectionStates = await getSectionStatesForTranslations(
      translations.map((t) => t.id),
    );

    for (const lang of languages) {
      contentByLocale[lang.locale] = "";
    }
    for (const tr of translations) {
      contentByLocale[tr.locale] = tr.content;
    }

    const localeByTranslationId = new Map<number, string>();
    for (const tr of translations) {
      localeByTranslationId.set(tr.id, tr.locale);
    }

    for (const lang of languages) {
      fuzzyByLocale[lang.locale] = {};
    }
    for (const state of sectionStates) {
      const locale = localeByTranslationId.get(state.documentTranslationId);
      if (!locale) continue;
      if (!fuzzyByLocale[locale]) fuzzyByLocale[locale] = {};
      fuzzyByLocale[locale][state.structuralPath] = state.isFuzzy;
    }
  }

  return {
    mode: DocumentMode.Document,
    projectFiles,
    selectedFileId: selectedFile.id,
    markdownData: {
      contentByLocale,
      fuzzyByLocale,
      tooFewLanguages,
      languages: normalizedLanguages,
    },
  };
}

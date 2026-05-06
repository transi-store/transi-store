import { Box } from "@chakra-ui/react";
import { MarkdownTranslateLayout } from "~/components/markdown-translate/MarkdownTranslateLayout";
import { MockupContainer } from "./MockupContainer";

const LANGUAGES = [
  { locale: "en", isDefault: true },
  { locale: "fr", isDefault: false },
  { locale: "es", isDefault: false },
];

const INITIAL_CONTENT: Record<string, string> = {
  en: [
    "# Getting started",
    "",
    "Welcome to the **transi-store** quick tour.",
    "",
    "## Install the CLI",
    "",
    "Run `yarn add @transi-store/cli` and authenticate.",
    "",
    "```bash",
    "yarn transi-store login",
    "```",
    "",
    "## Push your first file",
    "",
    "Once your project is created, push your locales.",
  ].join("\n"),
  fr: [
    "# Démarrage",
    "",
    "Bienvenue dans la visite guidée de **transi-store**.",
    "",
    "## Installer la CLI",
    "",
    "Exécutez `yarn add @transi-store/cli` et authentifiez-vous.",
    "",
    "```bash",
    "yarn transi-store login",
    "```",
  ].join("\n"),
  es: "",
};

export function MarkdownTranslateMockup() {
  return (
    <MockupContainer url="transi-store.com/orgs/acme/projects/docs/translations?fileId=12">
      <Box p={4} pointerEvents="none" minH="420px">
        <MarkdownTranslateLayout
          organizationSlug="acme"
          projectSlug="docs"
          fileId={0}
          filePath="docs/<lang>/getting-started.md"
          isMdx={false}
          languages={LANGUAGES}
          initialContent={INITIAL_CONTENT}
          fuzzyByLocale={{}}
          initialLeftLocale="en"
          initialRightLocale="fr"
          hasAiProvider={true}
        />
      </Box>
    </MockupContainer>
  );
}

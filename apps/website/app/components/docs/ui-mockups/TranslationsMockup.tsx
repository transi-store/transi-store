import { Box } from "@chakra-ui/react";
import { TranslationsTable } from "~/routes/orgs.$orgSlug.projects.$projectSlug.translations/TranslationsTable";
import type { RegularDataRow } from "~/lib/translation-helper";
import { MockupContainer } from "./MockupContainer";

const SAMPLE_KEYS: RegularDataRow[] = [
  {
    id: 1,
    projectId: 1,
    fileId: 1,
    branchId: null,
    keyName: "common.save",
    description: null,
    deletedAt: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    defaultTranslation: "Save",
    translatedLocales: ["fr", "de", "es"],
  },
  {
    id: 2,
    projectId: 1,
    fileId: 1,
    branchId: null,
    keyName: "common.cancel",
    description: null,
    deletedAt: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    defaultTranslation: "Cancel",
    translatedLocales: ["fr", "de"],
  },
  {
    id: 3,
    projectId: 1,
    fileId: 1,
    branchId: null,
    keyName: "checkout.title",
    description: null,
    deletedAt: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    defaultTranslation: "Checkout",
    translatedLocales: ["fr"],
  },
  {
    id: 4,
    projectId: 1,
    fileId: 1,
    branchId: null,
    keyName: "checkout.confirm_button",
    description: null,
    deletedAt: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    defaultTranslation: "Confirm order",
    translatedLocales: [],
  },
];

export function TranslationsMockup() {
  return (
    <MockupContainer url="transi-store.com/orgs/acme/projects/webapp/translations">
      {/* Real TranslationsTable component with sample data — non-interactive */}
      <Box pointerEvents="none">
        <TranslationsTable
          data={SAMPLE_KEYS}
          totalLanguages={3}
          organizationSlug="acme"
          projectSlug="webapp"
          currentUrl="/orgs/acme/projects/webapp/translations"
          onEditInDrawer={() => {}}
        />
      </Box>
    </MockupContainer>
  );
}

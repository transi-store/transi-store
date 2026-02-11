import { Table } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { TranslationKeyRow } from "./TranslationKeyRow";
import type { RegularDataRow, SearchDataRow } from "~/lib/translation-helper";

type TranslationsTableProps = {
  data: Array<RegularDataRow | SearchDataRow>;
  search?: string;
  totalLanguages: number;
  organizationSlug: string;
  projectSlug: string;
  currentUrl: string;
};

export function TranslationsTable({
  data,
  search,
  totalLanguages,
  organizationSlug,
  projectSlug,
  currentUrl,
}: TranslationsTableProps) {
  const { t } = useTranslation();

  return (
    <Table.Root variant="outline" interactive>
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader>
            {t("translations.table.keyName")}
          </Table.ColumnHeader>
          <Table.ColumnHeader w="300px">
            {t("translations.table.translations")}
          </Table.ColumnHeader>
          <Table.ColumnHeader w="280px">
            {t("translations.table.actions")}
          </Table.ColumnHeader>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {data.map((key) => (
          <TranslationKeyRow
            key={key.id}
            translationKey={key}
            search={search}
            totalLanguages={totalLanguages}
            organizationSlug={organizationSlug}
            projectSlug={projectSlug}
            currentUrl={currentUrl}
          />
        ))}
      </Table.Body>
    </Table.Root>
  );
}

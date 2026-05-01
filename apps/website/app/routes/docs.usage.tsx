import { DocLayout } from "~/components/docs/DocLayout";
import { mdxComponents } from "~/components/docs/MdxComponents";
import UsageContentEn from "~/docs/en/usage.mdx";
import UsageContentFr from "~/docs/fr/usage.mdx";
import UsageContentEs from "~/docs/es/usage.mdx";
import UsageContentDe from "~/docs/de/usage.mdx";
import { useTranslation } from "react-i18next";

export default function DocsUsagePage() {
  const { t, i18n } = useTranslation();

  let UsageContent;
  switch (i18n.language) {
    case "fr":
      UsageContent = UsageContentFr;
      break;
    case "es":
      UsageContent = UsageContentEs;
      break;
    case "de":
      UsageContent = UsageContentDe;
      break;
    default:
      UsageContent = UsageContentEn;
  }

  return (
    <DocLayout
      title={t("page.docs.usage.title")}
      description={t("page.docs.usage.description")}
    >
      <UsageContent components={mdxComponents} />
    </DocLayout>
  );
}

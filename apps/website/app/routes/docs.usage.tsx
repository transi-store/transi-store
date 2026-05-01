import { DocLayout } from "~/components/docs/DocLayout";
import { mdxComponents } from "~/components/docs/MdxComponents";
import UsageContent from "~/docs/usage.mdx";
import { useTranslation } from "react-i18next";

export default function DocsUsagePage() {
  const { t } = useTranslation();

  return (
    <DocLayout
      title={t("page.docs.usage.title")}
      description={t("page.docs.usage.description")}
    >
      <UsageContent components={mdxComponents} />
    </DocLayout>
  );
}

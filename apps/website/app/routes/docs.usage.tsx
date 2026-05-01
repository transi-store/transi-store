import { useTranslation } from "react-i18next";
import { DocLayout } from "~/components/docs/DocLayout";
import { mdxComponents } from "~/components/docs/MdxComponents";
import UsageContent from "~/docs/usage.mdx";

export default function DocsUsagePage() {
  const { t } = useTranslation();

  return (
    <DocLayout
      title="User Guide"
      description="Learn how to use Transi-Store to manage your translations."
    >
      <title>{t("page.docs.usage.title")}</title>
      <meta name="description" content={t("page.docs.usage.description")} />
      <UsageContent components={mdxComponents} />
    </DocLayout>
  );
}

import { useTranslation } from "react-i18next";
import { DocLayout } from "~/components/docs/DocLayout";
import { mdxComponents } from "~/components/docs/MdxComponents";
import DeveloperContent from "~/docs/developer.mdx";

export default function DocsDeveloperPage() {
  const { t } = useTranslation();

  return (
    <DocLayout
      title="Developer Guide"
      description="Self-host Transi-Store on your own infrastructure."
    >
      <title>{t("page.docs.developer.title")}</title>
      <meta name="description" content={t("page.docs.developer.description")} />
      <DeveloperContent components={mdxComponents} />
    </DocLayout>
  );
}

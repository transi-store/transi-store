import { DocLayout } from "~/components/docs/DocLayout";
import { mdxComponents } from "~/components/docs/MdxComponents";
import DeveloperContent from "~/docs/developer.mdx";
import { useTranslation } from "react-i18next";

export default function DocsDeveloperPage() {
  const { t } = useTranslation();

  return (
    <DocLayout
      title={t("page.docs.developer.title")}
      description={t("page.docs.developer.description")}
    >
      <DeveloperContent components={mdxComponents} />
    </DocLayout>
  );
}

import { DocLayout } from "~/components/docs/DocLayout";
import { mdxComponents } from "~/components/docs/MdxComponents";
import DeveloperContentEn from "~/docs/en/developer.mdx";
import DeveloperContentFr from "~/docs/fr/developer.mdx";
import DeveloperContentEs from "~/docs/es/developer.mdx";
import DeveloperContentDe from "~/docs/de/developer.mdx";
import { useTranslation } from "react-i18next";

export default function DocsDeveloperPage() {
  const { t, i18n } = useTranslation();

  let DeveloperContent;
  switch (i18n.language) {
    case "fr":
      DeveloperContent = DeveloperContentFr;
      break;
    case "es":
      DeveloperContent = DeveloperContentEs;
      break;
    case "de":
      DeveloperContent = DeveloperContentDe;
      break;
    default:
      DeveloperContent = DeveloperContentEn;
  }

  return (
    <DocLayout
      title={t("page.docs.developer.title")}
      description={t("page.docs.developer.description")}
    >
      <DeveloperContent components={mdxComponents} />
    </DocLayout>
  );
}

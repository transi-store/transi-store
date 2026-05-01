import type { Route } from "./+types/docs.usage";
import { getInstance } from "~/middleware/i18next";
import { DocLayout } from "~/components/docs/DocLayout";
import { mdxComponents } from "~/components/docs/MdxComponents";
import UsageContent from "~/docs/usage.mdx";

export async function loader({ context }: Route.LoaderArgs) {
  const i18next = getInstance(context);
  return {
    title: i18next.t("page.docs.usage.title"),
    description: i18next.t("page.docs.usage.description"),
  };
}

export function meta({ loaderData }: Route.MetaArgs) {
  return [
    { title: loaderData?.title ?? "User Guide — Transi-Store" },
    { name: "description", content: loaderData?.description ?? "" },
  ];
}

export default function DocsUsagePage() {
  return (
    <DocLayout
      title="User Guide"
      description="Learn how to use Transi-Store to manage your translations."
    >
      <UsageContent components={mdxComponents} />
    </DocLayout>
  );
}

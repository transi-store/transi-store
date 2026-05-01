import type { Route } from "./+types/docs.developer";
import { getInstance } from "~/middleware/i18next";
import { DocLayout } from "~/components/docs/DocLayout";
import { mdxComponents } from "~/components/docs/MdxComponents";
import DeveloperContent from "~/docs/developer.mdx";

export async function loader({ context }: Route.LoaderArgs) {
  const i18next = getInstance(context);
  return {
    title: i18next.t("page.docs.developer.title"),
    description: i18next.t("page.docs.developer.description"),
  };
}

export function meta({ loaderData }: Route.MetaArgs) {
  return [
    { title: loaderData?.title ?? "Developer Guide — Transi-Store" },
    { name: "description", content: loaderData?.description ?? "" },
  ];
}

export default function DocsDeveloperPage() {
  return (
    <DocLayout
      title="Developer Guide"
      description="Self-host Transi-Store on your own infrastructure."
    >
      <DeveloperContent components={mdxComponents} />
    </DocLayout>
  );
}

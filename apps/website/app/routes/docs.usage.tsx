import { DocLayout } from "~/components/docs/DocLayout";
import { mdxComponents } from "~/components/docs/MdxComponents";
import UsageContent from "~/docs/usage.mdx";

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

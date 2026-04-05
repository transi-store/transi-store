import { DocLayout } from "~/components/docs/DocLayout";
import { mdxComponents } from "~/components/docs/MdxComponents";
import DeveloperContent from "~/docs/developer.mdx";

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

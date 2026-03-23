import {
  AppBreadcrumb,
  type AppBreadcrumbItem,
} from "~/components/navigation/AppBreadcrumb";
import { getProjectUrl } from "~/lib/routes-helpers";

type BreadcrumbItem = {
  label: string;
  to: string;
};

type ProjectBreadcrumbProps = {
  organizationSlug: string;
  organizationName: string;
  projectSlug: string;
  projectName: string;
  /** Additional breadcrumb segments after the project. The last one is rendered as CurrentLink. */
  items?: BreadcrumbItem[];
  /** If provided, rendered as the final CurrentLink instead of the project name. */
  current?: string;
};

export function ProjectBreadcrumb({
  organizationSlug,
  organizationName,
  projectSlug,
  projectName,
  items,
  current,
}: ProjectBreadcrumbProps) {
  const hasExtraItems = items && items.length > 0;

  const allItems: Array<AppBreadcrumbItem> = [
    {
      label: organizationName,
      to: `/orgs/${organizationSlug}`,
      hideBelow: "sm",
    },
    ...(hasExtraItems
      ? [
          {
            label: projectName,
            to: getProjectUrl(organizationSlug, projectSlug),
          },
          ...items.map((item) => ({ label: item.label, to: item.to })),
        ]
      : [{ label: current ?? projectName }]),
  ];

  return <AppBreadcrumb items={allItems} />;
}

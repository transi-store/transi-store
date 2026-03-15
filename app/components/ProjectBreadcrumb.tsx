import { Breadcrumb, Heading } from "@chakra-ui/react";
import { Fragment } from "react";
import { NavLink } from "react-router";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

  return (
    <Breadcrumb.Root>
      <Breadcrumb.List>
        <Breadcrumb.Item>
          <Breadcrumb.Link asChild>
            <NavLink to="/orgs">{t("header.myOrganizations")}</NavLink>
          </Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Item hideBelow="sm">
          <Breadcrumb.Link asChild>
            <NavLink to={`/orgs/${organizationSlug}`}>
              {organizationName}
            </NavLink>
          </Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator hideBelow="sm" />

        {/* Project: link if there are extra items, otherwise current */}
        {items && items.length > 0 ? (
          <>
            <Breadcrumb.Item>
              <Breadcrumb.Link asChild>
                <NavLink
                  to={`/orgs/${organizationSlug}/projects/${projectSlug}`}
                >
                  {projectName}
                </NavLink>
              </Breadcrumb.Link>
            </Breadcrumb.Item>
            <Breadcrumb.Separator />
          </>
        ) : (
          <Breadcrumb.Item>
            <Breadcrumb.CurrentLink>
              <Heading as="span" size="sm">
                {current ?? projectName}
              </Heading>
            </Breadcrumb.CurrentLink>
          </Breadcrumb.Item>
        )}

        {/* Intermediate navigable items */}
        {items?.map((item, i) => (
          <Fragment key={item.to}>
            <Breadcrumb.Item>
              <Breadcrumb.Link asChild>
                <NavLink to={item.to}>{item.label}</NavLink>
              </Breadcrumb.Link>
            </Breadcrumb.Item>
            {i < items.length - 1 && <Breadcrumb.Separator />}{" "}
            {/* Separator except after the last item, which is the current page */}
          </Fragment>
        ))}
      </Breadcrumb.List>
    </Breadcrumb.Root>
  );
}

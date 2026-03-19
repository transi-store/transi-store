import { Breadcrumb } from "@chakra-ui/react";
import { NavLink } from "react-router";
import { useTranslation } from "react-i18next";

type OrgBreadcrumbProps = {
  organizationSlug?: string;
  organizationName?: string;
  /** If provided, rendered as the final CurrentLink after the org name. */
  current?: string;
};

export function OrgBreadcrumb({
  organizationSlug,
  organizationName,
  current,
}: OrgBreadcrumbProps) {
  const { t } = useTranslation();

  return (
    <Breadcrumb.Root>
      <Breadcrumb.List>
        {organizationSlug ? (
          <>
            <Breadcrumb.Item>
              <Breadcrumb.Link asChild>
                <NavLink to="/orgs">{t("header.myOrganizations")}</NavLink>
              </Breadcrumb.Link>
            </Breadcrumb.Item>
            <Breadcrumb.Separator />

            {current ? (
              <>
                <Breadcrumb.Item>
                  <Breadcrumb.Link asChild>
                    <NavLink to={`/orgs/${organizationSlug}`}>
                      {organizationName}
                    </NavLink>
                  </Breadcrumb.Link>
                </Breadcrumb.Item>
                <Breadcrumb.Separator />
                <Breadcrumb.Item>
                  <Breadcrumb.CurrentLink>{current}</Breadcrumb.CurrentLink>
                </Breadcrumb.Item>
              </>
            ) : (
              <Breadcrumb.Item>
                <Breadcrumb.CurrentLink>
                  {organizationName}
                </Breadcrumb.CurrentLink>
              </Breadcrumb.Item>
            )}
          </>
        ) : (
          <Breadcrumb.Item>
            <Breadcrumb.CurrentLink>
              {t("header.myOrganizations")}
            </Breadcrumb.CurrentLink>
          </Breadcrumb.Item>
        )}
      </Breadcrumb.List>
    </Breadcrumb.Root>
  );
}

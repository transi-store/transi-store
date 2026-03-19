import { Breadcrumb } from "@chakra-ui/react";
import { Fragment, type JSX } from "react";
import { NavLink } from "react-router";
import { useTranslation } from "react-i18next";

export type AppBreadcrumbItem = {
  label: string;
  /** If provided, renders as a navigable link. If omitted, renders as the current (non-navigable) item. */
  to?: string;
  hideBelow?: "sm" | "md";
};

type AppBreadcrumbProps = {
  /**
   * Segments after the "Mes organisations" root.
   * Items with `to` are links; the last item without `to` is the current page.
   * If empty or omitted, "Mes organisations" itself is the current item.
   */
  items?: Array<AppBreadcrumbItem>;
};

export function AppBreadcrumb({ items = [] }: AppBreadcrumbProps): JSX.Element {
  const { t } = useTranslation();

  const hasItems = items.length > 0;

  return (
    <Breadcrumb.Root>
      <Breadcrumb.List>
        <Breadcrumb.Item>
          {hasItems ? (
            <Breadcrumb.Link asChild>
              <NavLink to="/orgs">{t("header.myOrganizations")}</NavLink>
            </Breadcrumb.Link>
          ) : (
            <Breadcrumb.CurrentLink>
              {t("header.myOrganizations")}
            </Breadcrumb.CurrentLink>
          )}
        </Breadcrumb.Item>

        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          const isCurrent = isLast && !item.to;

          return (
            <Fragment key={i}>
              <Breadcrumb.Separator hideBelow={item.hideBelow} />
              <Breadcrumb.Item hideBelow={item.hideBelow}>
                {isCurrent ? (
                  <Breadcrumb.CurrentLink>{item.label}</Breadcrumb.CurrentLink>
                ) : (
                  <Breadcrumb.Link asChild>
                    <NavLink to={item.to!}>{item.label}</NavLink>
                  </Breadcrumb.Link>
                )}
              </Breadcrumb.Item>
            </Fragment>
          );
        })}
      </Breadcrumb.List>
    </Breadcrumb.Root>
  );
}

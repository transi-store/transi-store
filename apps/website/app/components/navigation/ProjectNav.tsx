import { Button, HStack } from "@chakra-ui/react";
import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { LuImport, LuLanguages, LuSettings, LuGitBranch } from "react-icons/lu";
import { getProjectUrl } from "~/lib/routes-helpers";

type ProjectNavProps = {
  organizationSlug: string;
  projectSlug: string;
};

export function ProjectNav({ organizationSlug, projectSlug }: ProjectNavProps) {
  const { t } = useTranslation();
  const location = useLocation();

  const baseUrl = getProjectUrl(organizationSlug, projectSlug);

  const navItems = [
    {
      path: "translations",
      label: t("translations.title"),
      icon: <LuLanguages />,
    },
    { path: "branches", label: t("branches.title"), icon: <LuGitBranch /> },
    {
      path: "settings",
      label: t("orgs.tab.settings"),
      icon: <LuSettings />,
    },
    { path: "import-export", label: t("import.title"), icon: <LuImport /> },
  ];

  return (
    <HStack
      gap={2}
      flexWrap="wrap"
      justify={{ base: "flex-start", md: "flex-end" }}
      flex={{ base: "1", md: "auto" }}
    >
      {navItems.map((item) => {
        const fullPath = `${baseUrl}/${item.path}`;
        const isActive =
          location.pathname === fullPath ||
          location.pathname.startsWith(`${fullPath}/`);

        return (
          <Button
            key={item.path}
            asChild
            variant={isActive ? "solid" : "outline"}
            colorPalette={isActive ? "brand" : "gray"}
            size="sm"
            borderRadius="full"
            bg={isActive ? undefined : "surface.panelMuted"}
            borderColor={isActive ? undefined : "surface.border"}
          >
            <Link to={fullPath}>
              {item.icon} {item.label}
            </Link>
          </Button>
        );
      })}
    </HStack>
  );
}

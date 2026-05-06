import { Button, HStack } from "@chakra-ui/react";
import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { LuImport, LuLanguages, LuSettings, LuGitBranch } from "react-icons/lu";
import { getProjectUrl } from "~/lib/routes-helpers";
import { ProjectAccessRole } from "~/lib/project-visibility";

type ProjectNavProps = {
  organizationSlug: string;
  projectSlug: string;
  projectAccessRole: ProjectAccessRole;
};

export function ProjectNav({
  organizationSlug,
  projectSlug,
  projectAccessRole,
}: ProjectNavProps) {
  const { t } = useTranslation();
  const location = useLocation();

  const baseUrl = getProjectUrl(organizationSlug, projectSlug);
  const isMember = projectAccessRole === ProjectAccessRole.MEMBER;

  const navItems = [
    {
      path: "translations",
      label: t("translations.title"),
      icon: <LuLanguages />,
      membersOnly: false,
    },
    {
      path: "branches",
      label: t("branches.title"),
      icon: <LuGitBranch />,
      membersOnly: true,
    },
    {
      path: "settings",
      label: t("orgs.tab.settings"),
      icon: <LuSettings />,
      membersOnly: true,
    },
    {
      path: "import-export",
      label: t("import.title"),
      icon: <LuImport />,
      membersOnly: true,
    },
  ].filter((item) => !item.membersOnly || isMember);

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
            variant={isActive ? "solid" : "ghost"}
            colorPalette={isActive ? "brand" : "gray"}
            size="sm"
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

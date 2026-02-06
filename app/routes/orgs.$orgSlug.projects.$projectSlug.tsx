import {
  Breadcrumb,
  Container,
  Heading,
  VStack,
  Button,
  Box,
  HStack,
  Text,
  Spacer,
} from "@chakra-ui/react";
import {
  Link,
  NavLink,
  Outlet,
  useLoaderData,
  useLocation,
} from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/orgs.$orgSlug.projects.$projectSlug";
import { requireUser } from "~/lib/session.server";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import { getProjectBySlug, getProjectLanguages } from "~/lib/projects.server";
import { LuImport, LuLanguages, LuSettings } from "react-icons/lu";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const organization = await requireOrganizationMembership(
    user,
    params.orgSlug,
  );

  const project = await getProjectBySlug(organization.id, params.projectSlug);
  if (!project) {
    throw new Response("Project not found", { status: 404 });
  }

  const languages = await getProjectLanguages(project.id);

  return { organization, project, languages };
}

export default function ProjectLayout() {
  const { organization, project, languages } = useLoaderData<typeof loader>();
  const location = useLocation();
  const { t } = useTranslation();

  const navItems = [
    {
      path: "translations",
      label: t("translations.title"),
      icon: <LuLanguages />,
    },
    { path: "settings", label: t("orgs.tab.settings"), icon: <LuSettings /> },
    { path: "import-export", label: t("import.title"), icon: <LuImport /> },
  ];

  return (
    <Container maxW="container.xl" py={5}>
      <Box></Box>

      <VStack gap={4} align="stretch">
        {/* Navigation */}
        <HStack gap={2} borderBottomWidth={1} pb={2}>
          <Breadcrumb.Root>
            <Breadcrumb.List>
              <Breadcrumb.Item>
                <Breadcrumb.Link asChild>
                  <NavLink to="/orgs">{t("header.myOrganizations")}</NavLink>
                </Breadcrumb.Link>
              </Breadcrumb.Item>
              <Breadcrumb.Separator />
              <Breadcrumb.Item>
                <Breadcrumb.Link asChild>
                  <NavLink to={`/orgs/${organization.slug}`}>
                    {organization.name}
                  </NavLink>
                </Breadcrumb.Link>
              </Breadcrumb.Item>
              <Breadcrumb.Separator />
              <Breadcrumb.Item>
                <Breadcrumb.CurrentLink>
                  <Heading as="span" size="sm">
                    {project.name}
                  </Heading>
                </Breadcrumb.CurrentLink>
              </Breadcrumb.Item>
            </Breadcrumb.List>
          </Breadcrumb.Root>

          <Spacer />

          {navItems.map((item) => {
            const fullPath = `/orgs/${organization.slug}/projects/${project.slug}/${item.path}`;
            const isActive = location.pathname === fullPath;

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

        {project.description && (
          <Box>
            <Text color="fg.muted">{project.description}</Text>
          </Box>
        )}

        {/* Child route content */}
        <Outlet context={{ organization, project, languages }} />
      </VStack>
    </Container>
  );
}

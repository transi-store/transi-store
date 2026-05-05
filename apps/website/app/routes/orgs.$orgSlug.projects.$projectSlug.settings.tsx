import {
  Badge,
  Box,
  Button,
  Card,
  DialogBackdrop,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPositioner,
  DialogRoot,
  DialogTitle,
  Field,
  Heading,
  HStack,
  Input,
  Menu,
  Portal,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  Form,
  useActionData,
  useFetcher,
  useNavigation,
  useOutletContext,
  redirect,
} from "react-router";
import { useMemo, useState } from "react";
import { LuEllipsis, LuPlus, LuStar, LuTrash2 } from "react-icons/lu";
import type { Route } from "./+types/orgs.$orgSlug.projects.$projectSlug.settings";
import { userContext } from "~/middleware/auth";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import {
  getProjectBySlug,
  getProjectLanguages,
  addLanguageToProject,
  deleteProject,
  getProjectDeletionSummary,
  removeLanguageFromProject,
  setDefaultLanguageForProject,
} from "~/lib/projects.server";
import { useTranslation } from "react-i18next";
import { createProjectNotFoundResponse } from "~/errors/response-errors/ProjectNotFoundResponse";

type ContextType = {
  organization: { id: string; slug: string; name: string };
  project: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
  };
  languages: Array<{ id: string; locale: string; isDefault: boolean }>;
};

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const user = context.get(userContext);
  const organization = await requireOrganizationMembership(
    user,
    params.orgSlug,
  );

  const project = await getProjectBySlug(organization.id, params.projectSlug);
  if (!project) {
    throw createProjectNotFoundResponse(params.projectSlug);
  }

  const url = new URL(request.url);
  if (url.searchParams.get("dialog") === "delete-project") {
    return {
      deleteSummary: await getProjectDeletionSummary(project.id),
    };
  }

  return { deleteSummary: null };
}

export async function action({ request, params, context }: Route.ActionArgs) {
  const user = context.get(userContext);
  const organization = await requireOrganizationMembership(
    user,
    params.orgSlug,
  );

  const project = await getProjectBySlug(organization.id, params.projectSlug);
  if (!project) {
    throw createProjectNotFoundResponse(params.projectSlug);
  }

  const formData = await request.formData();
  const action = formData.get("_action");

  if (action === "add_language") {
    const locale = formData.get("locale");

    if (!locale || typeof locale !== "string") {
      return { error: "Le code de langue est requis" };
    }

    // Vérifier que la langue n'existe pas déjà
    const existingLanguages = await getProjectLanguages(project.id);
    if (existingLanguages.some((l) => l.locale === locale)) {
      return { error: `La langue "${locale}" existe deja` };
    }

    await addLanguageToProject({
      projectId: project.id,
      locale,
      isDefault: existingLanguages.length === 0,
    });

    return { success: true };
  }

  if (action === "remove_language") {
    const locale = formData.get("locale");

    if (!locale || typeof locale !== "string") {
      return { error: "Le code de langue est requis" };
    }

    await removeLanguageFromProject(project.id, locale);

    return { success: true };
  }

  if (action === "set_default_language") {
    const locale = formData.get("locale");

    if (!locale || typeof locale !== "string") {
      return { error: "Le code de langue est requis" };
    }

    const existingLanguages = await getProjectLanguages(project.id);
    if (!existingLanguages.some((l) => l.locale === locale)) {
      return { error: `La langue "${locale}" n'existe pas dans ce projet` };
    }

    await setDefaultLanguageForProject(project.id, locale);

    return { success: true };
  }

  if (action === "delete_project") {
    await deleteProject(project.id);

    return redirect(`/orgs/${params.orgSlug}`);
  }

  return { error: "Action invalide" };
}

export default function ProjectSettings() {
  const { organization, project, languages } = useOutletContext<ContextType>();
  const actionData = useActionData<typeof action>();
  const deleteSummaryFetcher = useFetcher<typeof loader>();
  const navigation = useNavigation();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const { t } = useTranslation();
  const submittedAction = navigation.formData?.get("_action");
  const isSubmitting = navigation.state === "submitting";
  const isLanguageSubmitting =
    isSubmitting &&
    (submittedAction === "add_language" ||
      submittedAction === "remove_language" ||
      submittedAction === "set_default_language");
  const isDeleteSubmitting =
    isSubmitting && submittedAction === "delete_project";
  const expectedDeleteValue = `${organization.slug}/${project.slug}`;
  const deleteSummaryUrl = useMemo(
    () =>
      `/orgs/${organization.slug}/projects/${project.slug}/settings?dialog=delete-project`,
    [organization.slug, project.slug],
  );
  const deleteSummary = deleteSummaryFetcher.data?.deleteSummary;
  const isDeleteSummaryLoading =
    isDeleteDialogOpen &&
    (deleteSummaryFetcher.state === "loading" ||
      deleteSummaryFetcher.data === undefined);
  const isDeleteConfirmationValid = deleteConfirmation === expectedDeleteValue;

  function openDeleteDialog() {
    setDeleteConfirmation("");
    setIsDeleteDialogOpen(true);

    if (deleteSummaryFetcher.data === undefined) {
      deleteSummaryFetcher.load(deleteSummaryUrl);
    }
  }

  function setDeleteDialogOpen(open: boolean) {
    setIsDeleteDialogOpen(open);
    if (!open) {
      setDeleteConfirmation("");
    }
  }

  return (
    <VStack gap={8} align="stretch">
      {/* Informations du projet */}
      <Box>
        <Heading as="h2" size="lg" mb={4}>
          {t("settings.projectInformation")}
        </Heading>
        <VStack gap={2} align="stretch">
          <Box>
            <Text fontSize="sm" color="fg.muted">
              {t("settings.projectName")}
            </Text>
            <Text>{project.name}</Text>
          </Box>
          {project.description && (
            <Box>
              <Text fontSize="sm" color="fg.muted">
                {t("settings.projectDescription")}
              </Text>
              <Text>{project.description}</Text>
            </Box>
          )}
          <Box>
            <Text fontSize="sm" color="fg.muted">
              {t("settings.projectSlug")}
            </Text>
            <Text fontFamily="mono" fontSize="sm">
              /{organization.slug}/{project.slug}
            </Text>
          </Box>
        </VStack>
      </Box>

      {/* Langues */}
      <Box>
        <Heading as="h2" size="lg" mb={4}>
          {t("settings.languages", { count: languages.length })}
        </Heading>

        {actionData?.error && (
          <Box p={4} bg="red.subtle" color="red.fg" borderRadius="md" mb={4}>
            {actionData.error}
          </Box>
        )}

        {actionData?.success && (
          <Box
            p={4}
            bg="green.subtle"
            color="green.fg"
            borderRadius="md"
            mb={4}
          >
            {t("settings.languageActionSuccess")}
          </Box>
        )}

        {languages.length === 0 ? (
          <Box
            p={10}
            textAlign="center"
            borderWidth={1}
            borderRadius="lg"
            mb={4}
          >
            <Text color="fg.muted" mb={4}>
              {t("settings.noLanguages")}
            </Text>
          </Box>
        ) : (
          <SimpleGrid columns={{ base: 2, md: 4 }} gap={3} mb={4}>
            {languages.map((lang) => (
              <Card.Root key={lang.id}>
                <Card.Body>
                  <HStack justify="space-between">
                    <Box>
                      <Text>{lang.locale}</Text>
                      {lang.isDefault && (
                        <Badge colorPalette="brand" size="sm">
                          {t("settings.default")}
                        </Badge>
                      )}
                    </Box>
                    <Menu.Root>
                      <Menu.Trigger asChild>
                        <Button
                          size="xs"
                          variant="ghost"
                          aria-label={t("settings.languageMenu.label")}
                          disabled={isLanguageSubmitting}
                        >
                          <LuEllipsis />
                        </Button>
                      </Menu.Trigger>
                      <Portal>
                        <Menu.Positioner>
                          <Menu.Content>
                            <Form method="post">
                              <input
                                type="hidden"
                                name="_action"
                                value="set_default_language"
                              />
                              <input
                                type="hidden"
                                name="locale"
                                value={lang.locale}
                              />
                              <Menu.Item
                                value="set_default"
                                asChild
                                disabled={lang.isDefault}
                              >
                                <button type="submit" style={{ width: "100%" }}>
                                  <LuStar />
                                  {t("settings.languageMenu.setAsDefault")}
                                </button>
                              </Menu.Item>
                            </Form>
                            <Form method="post">
                              <input
                                type="hidden"
                                name="_action"
                                value="remove_language"
                              />
                              <input
                                type="hidden"
                                name="locale"
                                value={lang.locale}
                              />
                              <Menu.Item value="remove" asChild color="red.fg">
                                <button type="submit" style={{ width: "100%" }}>
                                  <LuTrash2 />
                                  {t("settings.languageMenu.remove")}
                                </button>
                              </Menu.Item>
                            </Form>
                          </Menu.Content>
                        </Menu.Positioner>
                      </Portal>
                    </Menu.Root>
                  </HStack>
                </Card.Body>
              </Card.Root>
            ))}
          </SimpleGrid>
        )}

        <Form method="post">
          <input type="hidden" name="_action" value="add_language" />
          <HStack>
            <Field.Root flex={1}>
              <Input
                name="locale"
                placeholder="fr, en, de..."
                disabled={isLanguageSubmitting}
              />
            </Field.Root>
            <Button
              type="submit"
              colorPalette="brand"
              loading={isLanguageSubmitting}
            >
              <LuPlus /> {t("settings.addLanguage")}
            </Button>
          </HStack>
        </Form>
      </Box>

      <Box borderWidth={1} borderColor="red.subtle" borderRadius="lg" p={5}>
        <Heading as="h2" size="lg" mb={2}>
          {t("settings.deleteProject.title")}
        </Heading>
        <Text color="fg.muted" mb={4}>
          {t("settings.deleteProject.description")}
        </Text>
        <Button colorPalette="red" onClick={openDeleteDialog}>
          {t("settings.deleteProject.button")}
        </Button>
      </Box>

      <DialogRoot
        open={isDeleteDialogOpen}
        onOpenChange={(event) => setDeleteDialogOpen(event.open)}
      >
        <Portal>
          <DialogBackdrop />
          <DialogPositioner>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {t("settings.deleteProject.dialogTitle")}
                </DialogTitle>
              </DialogHeader>
              <DialogCloseTrigger />
              <DialogBody pb={6}>
                <VStack gap={4} align="stretch">
                  <Box p={4} bg="red.subtle" color="red.fg" borderRadius="md">
                    <Text fontWeight="bold" mb={2}>
                      {t("settings.deleteProject.warningTitle")}
                    </Text>
                    <Text>{t("settings.deleteProject.warning")}</Text>
                    {isDeleteSummaryLoading ? (
                      <HStack mt={3}>
                        <Spinner size="sm" />
                        <Text>
                          {t("settings.deleteProject.loadingSummary")}
                        </Text>
                      </HStack>
                    ) : (
                      deleteSummary && (
                        <Text mt={3}>
                          {t("settings.deleteProject.summary", deleteSummary)}
                        </Text>
                      )
                    )}
                    <Text mt={3}>
                      {t("settings.deleteProject.additionalWarning")}
                    </Text>
                  </Box>

                  <Field.Root required>
                    <Field.Label>
                      {t("settings.deleteProject.confirmationLabel")}
                    </Field.Label>
                    <Field.HelperText>
                      {t("settings.deleteProject.confirmationNote", {
                        projectPath: expectedDeleteValue,
                      })}
                    </Field.HelperText>
                    <Input
                      value={deleteConfirmation}
                      onChange={(event) =>
                        setDeleteConfirmation(event.target.value)
                      }
                      placeholder={expectedDeleteValue}
                      disabled={isDeleteSubmitting}
                      fontFamily="mono"
                    />
                  </Field.Root>
                </VStack>
              </DialogBody>
              <DialogFooter gap={3}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                  disabled={isDeleteSubmitting}
                >
                  {t("settings.cancel")}
                </Button>
                <Form method="post">
                  <input type="hidden" name="_action" value="delete_project" />
                  <Button
                    type="submit"
                    colorPalette="red"
                    loading={isDeleteSubmitting}
                    disabled={
                      isDeleteSummaryLoading ||
                      !deleteSummary ||
                      !isDeleteConfirmationValid
                    }
                  >
                    {t("settings.deleteProject.confirmButton")}
                  </Button>
                </Form>
              </DialogFooter>
            </DialogContent>
          </DialogPositioner>
        </Portal>
      </DialogRoot>
    </VStack>
  );
}

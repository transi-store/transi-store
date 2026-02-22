/**
 * Page de configuration GitHub pour un projet transi-store
 * /orgs/:orgSlug/projects/:projectSlug/github
 *
 * Permet de :
 * - Lier un projet à un repo GitHub (via une installation GitHub App)
 * - Configurer le pattern des fichiers JSON et la locale source
 * - Afficher et résoudre les conflits de traduction
 */

import {
  Heading,
  VStack,
  Button,
  Box,
  Text,
  Badge,
  Input,
  Field,
  HStack,
  Card,
  Alert,
  Select,
  createListCollection,
} from "@chakra-ui/react";
import { Form, useActionData, useNavigation } from "react-router";
import { LuGithub, LuTriangle } from "react-icons/lu";
import type { Route } from "./+types/index";
import { requireUser } from "~/lib/session.server";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import { getProjectBySlug, getProjectLanguages } from "~/lib/projects.server";
import { db, schema } from "~/lib/db.server";
import { eq, and } from "drizzle-orm";
import { resolveConflict } from "~/lib/github-sync.server";

// ─── Loader ───────────────────────────────────────────────────────────────────

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

  // Config GitHub existante
  const githubConfig = await db.query.projectGithubConfigs.findFirst({
    where: { projectId: project.id },
    with: { installation: true },
  });

  // Installations GitHub App disponibles pour cette organisation
  const installations = await db.query.githubAppInstallations.findMany({
    where: { organizationId: organization.id },
  });

  // Conflits en attente pour ce projet
  const conflicts = await db
    .select({
      translationId: schema.translations.id,
      value: schema.translations.value,
      conflictIncomingValue: schema.translations.conflictIncomingValue,
      locale: schema.translations.locale,
      keyName: schema.translationKeys.keyName,
    })
    .from(schema.translations)
    .innerJoin(
      schema.translationKeys,
      eq(schema.translations.keyId, schema.translationKeys.id),
    )
    .where(
      and(
        eq(schema.translationKeys.projectId, project.id),
        eq(schema.translations.hasConflict, true),
      ),
    );

  // URL d'installation GitHub App
  const appSlug = process.env.GITHUB_APP_SLUG;
  const installUrl = appSlug
    ? `https://github.com/apps/${appSlug}/installations/new?state=${params.orgSlug}`
    : null;

  return { githubConfig, installations, conflicts, installUrl, languages };
}

// ─── Action ───────────────────────────────────────────────────────────────────

type ActionData =
  | { success: true; message: string }
  | { success: false; error: string };

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireUser(request);
  const organization = await requireOrganizationMembership(
    user,
    params.orgSlug,
  );

  const project = await getProjectBySlug(organization.id, params.projectSlug);
  if (!project) {
    throw new Response("Project not found", { status: 404 });
  }

  const formData = await request.formData();
  const intent = formData.get("_intent") as string;

  // ── Sauvegarder la config GitHub ──────────────────────────────────────────
  if (intent === "save_github_config") {
    const installationDbId = Number(formData.get("installation_db_id"));
    const repoFullName = formData.get("repo_full_name") as string;
    const defaultBranch = (formData.get("default_branch") as string) || "main";
    const sourceLocale = formData.get("source_locale") as string;
    const localePathPattern = formData.get("locale_path_pattern") as string;

    if (
      !repoFullName ||
      !sourceLocale ||
      !localePathPattern ||
      !installationDbId
    ) {
      return {
        success: false,
        error: "Tous les champs sont requis",
      } satisfies ActionData;
    }

    const existing = await db.query.projectGithubConfigs.findFirst({
      where: { projectId: project.id },
    });

    if (existing) {
      await db
        .update(schema.projectGithubConfigs)
        .set({
          installationId: installationDbId,
          repoFullName,
          defaultBranch,
          sourceLocale,
          localePathPattern,
          updatedAt: new Date(),
        })
        .where(eq(schema.projectGithubConfigs.id, existing.id));
    } else {
      await db.insert(schema.projectGithubConfigs).values({
        projectId: project.id,
        installationId: installationDbId,
        repoFullName,
        defaultBranch,
        sourceLocale,
        localePathPattern,
      });
    }

    return {
      success: true,
      message: "Configuration GitHub sauvegardée",
    } satisfies ActionData;
  }

  // ── Résolution de conflit ────────────────────────────────────────────────
  if (intent === "resolve_conflict") {
    const translationId = Number(formData.get("translation_id"));
    const resolution = formData.get("resolution") as
      | "accept_github"
      | "keep_transi_store";

    if (!translationId || !resolution) {
      return {
        success: false,
        error: "Paramètres de résolution manquants",
      } satisfies ActionData;
    }

    try {
      await resolveConflict(translationId, resolution);
      return {
        success: true,
        message: "Conflit résolu",
      } satisfies ActionData;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      return { success: false, error: message } satisfies ActionData;
    }
  }

  return { success: false, error: "Action non reconnue" } satisfies ActionData;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProjectGithubPage({
  loaderData,
}: Route.ComponentProps) {
  const { githubConfig, installations, conflicts, installUrl, languages } =
    loaderData;
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const installationsCollection = createListCollection({
    items: installations.map((i) => ({
      label: i.accountLogin,
      value: String(i.id),
    })),
  });

  const localesCollection = createListCollection({
    items: languages.map((l) => ({
      label: l.locale,
      value: l.locale,
    })),
  });

  return (
    <VStack align="stretch" gap={8}>
      {/* En-tête */}
      <HStack>
        <LuGithub size={24} />
        <Heading size="md">Configuration GitHub</Heading>
      </HStack>

      {/* Message de retour */}
      {actionData && (
        <Alert.Root status={actionData.success ? "success" : "error"}>
          <Alert.Indicator />
          <Alert.Title>
            {actionData.success ? actionData.message : actionData.error}
          </Alert.Title>
        </Alert.Root>
      )}

      {/* Installation GitHub App */}
      {installations.length === 0 && (
        <Card.Root>
          <Card.Body>
            <VStack align="start" gap={3}>
              <Heading size="sm">GitHub App non installée</Heading>
              <Text fontSize="sm" color="gray.600">
                Pour lier ce projet à un repo GitHub, vous devez d'abord
                installer la GitHub App transi-store sur votre compte ou
                organisation GitHub.
              </Text>
              {installUrl ? (
                <Button asChild colorScheme="gray" variant="outline">
                  <a
                    href={installUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <LuGithub />
                    Installer la GitHub App
                  </a>
                </Button>
              ) : (
                <Text fontSize="sm" color="red.500">
                  GITHUB_APP_SLUG non configuré. Contactez l'administrateur.
                </Text>
              )}
            </VStack>
          </Card.Body>
        </Card.Root>
      )}

      {/* Formulaire de configuration */}
      {installations.length > 0 && (
        <Card.Root>
          <Card.Header>
            <Heading size="sm">Lier à un repo GitHub</Heading>
          </Card.Header>
          <Card.Body>
            <Form method="post">
              <input type="hidden" name="_intent" value="save_github_config" />
              <VStack align="stretch" gap={4}>
                {/* Sélection de l'installation */}
                <Field.Root required>
                  <Field.Label>Compte GitHub (installation)</Field.Label>
                  <Select.Root
                    name="installation_db_id"
                    collection={installationsCollection}
                    defaultValue={
                      githubConfig
                        ? [String(githubConfig.installationId)]
                        : undefined
                    }
                  >
                    <Select.Trigger>
                      <Select.ValueText placeholder="Sélectionner un compte" />
                    </Select.Trigger>
                    <Select.Content>
                      {installationsCollection.items.map((item) => (
                        <Select.Item key={item.value} item={item}>
                          {item.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                  <Field.HelperText>
                    Compte GitHub sur lequel la App est installée.{" "}
                    {installUrl && (
                      <a
                        href={installUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: "underline" }}
                      >
                        Ajouter un compte
                      </a>
                    )}
                  </Field.HelperText>
                </Field.Root>

                {/* Nom complet du repo */}
                <Field.Root required>
                  <Field.Label>Repo GitHub</Field.Label>
                  <Input
                    name="repo_full_name"
                    placeholder="owner/repository"
                    defaultValue={githubConfig?.repoFullName ?? ""}
                  />
                  <Field.HelperText>Ex: my-org/my-app</Field.HelperText>
                </Field.Root>

                {/* Branche par défaut */}
                <Field.Root>
                  <Field.Label>Branche par défaut</Field.Label>
                  <Input
                    name="default_branch"
                    placeholder="main"
                    defaultValue={githubConfig?.defaultBranch ?? "main"}
                  />
                </Field.Root>

                {/* Locale source */}
                <Field.Root required>
                  <Field.Label>Locale source</Field.Label>
                  <Select.Root
                    name="source_locale"
                    collection={localesCollection}
                    defaultValue={
                      githubConfig ? [githubConfig.sourceLocale] : undefined
                    }
                  >
                    <Select.Trigger>
                      <Select.ValueText placeholder="Sélectionner la locale source" />
                    </Select.Trigger>
                    <Select.Content>
                      {localesCollection.items.map((item) => (
                        <Select.Item key={item.value} item={item}>
                          {item.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                  <Field.HelperText>
                    La locale que les développeurs écrivent dans le code.
                  </Field.HelperText>
                </Field.Root>

                {/* Pattern du chemin */}
                <Field.Root required>
                  <Field.Label>Pattern des fichiers JSON</Field.Label>
                  <Input
                    name="locale_path_pattern"
                    placeholder="public/locales/{locale}.json"
                    defaultValue={githubConfig?.localePathPattern ?? ""}
                  />
                  <Field.HelperText>
                    Utilisez {"{locale}"} comme placeholder pour la locale. Ex:{" "}
                    <code>public/locales/{"{locale}"}.json</code>
                  </Field.HelperText>
                </Field.Root>

                <Button
                  type="submit"
                  colorScheme="blue"
                  loading={isSubmitting}
                  alignSelf="start"
                >
                  Sauvegarder la configuration
                </Button>
              </VStack>
            </Form>
          </Card.Body>
        </Card.Root>
      )}

      {/* Conflits en attente */}
      {conflicts.length > 0 && (
        <Card.Root borderColor="orange.300" borderWidth={1}>
          <Card.Header>
            <HStack>
              <LuTriangle color="orange" />
              <Heading size="sm" color="orange.600">
                {conflicts.length} conflit(s) à résoudre
              </Heading>
            </HStack>
          </Card.Header>
          <Card.Body>
            <VStack align="stretch" gap={4}>
              <Text fontSize="sm" color="gray.600">
                Ces clés ont été modifiées à la fois dans GitHub et dans
                transi-store depuis la dernière synchronisation. Choisissez
                quelle valeur conserver.
              </Text>

              {conflicts.map((conflict) => (
                <Box
                  key={conflict.translationId}
                  borderWidth={1}
                  borderRadius="md"
                  p={4}
                  borderColor="orange.200"
                  bg="orange.50"
                >
                  <VStack align="stretch" gap={3}>
                    <HStack>
                      <Badge colorScheme="orange">{conflict.locale}</Badge>
                      <Text fontWeight="medium" fontFamily="mono" fontSize="sm">
                        {conflict.keyName}
                      </Text>
                    </HStack>

                    <Box>
                      <Text fontSize="xs" color="gray.500" mb={1}>
                        Valeur actuelle dans transi-store :
                      </Text>
                      <Text
                        fontSize="sm"
                        p={2}
                        bg="white"
                        borderRadius="sm"
                        borderWidth={1}
                      >
                        {conflict.value}
                      </Text>
                    </Box>

                    <Box>
                      <Text fontSize="xs" color="gray.500" mb={1}>
                        Valeur entrante depuis GitHub :
                      </Text>
                      <Text
                        fontSize="sm"
                        p={2}
                        bg="white"
                        borderRadius="sm"
                        borderWidth={1}
                        borderColor="orange.300"
                      >
                        {conflict.conflictIncomingValue}
                      </Text>
                    </Box>

                    <HStack>
                      <Form method="post">
                        <input
                          type="hidden"
                          name="_intent"
                          value="resolve_conflict"
                        />
                        <input
                          type="hidden"
                          name="translation_id"
                          value={String(conflict.translationId)}
                        />
                        <input
                          type="hidden"
                          name="resolution"
                          value="accept_github"
                        />
                        <Button
                          type="submit"
                          size="sm"
                          colorScheme="orange"
                          variant="outline"
                          loading={isSubmitting}
                        >
                          Accepter la valeur GitHub
                        </Button>
                      </Form>

                      <Form method="post">
                        <input
                          type="hidden"
                          name="_intent"
                          value="resolve_conflict"
                        />
                        <input
                          type="hidden"
                          name="translation_id"
                          value={String(conflict.translationId)}
                        />
                        <input
                          type="hidden"
                          name="resolution"
                          value="keep_transi_store"
                        />
                        <Button
                          type="submit"
                          size="sm"
                          colorScheme="blue"
                          variant="outline"
                          loading={isSubmitting}
                        >
                          Garder la valeur transi-store
                        </Button>
                      </Form>
                    </HStack>
                  </VStack>
                </Box>
              ))}
            </VStack>
          </Card.Body>
        </Card.Root>
      )}

      {conflicts.length === 0 && githubConfig && (
        <Box
          p={3}
          bg="green.50"
          borderRadius="md"
          borderWidth={1}
          borderColor="green.200"
        >
          <Text fontSize="sm" color="green.700">
            ✓ Aucun conflit en attente. Repo lié :{" "}
            <strong>{githubConfig.repoFullName}</strong> · Locale source :{" "}
            <strong>{githubConfig.sourceLocale}</strong>
          </Text>
        </Box>
      )}
    </VStack>
  );
}

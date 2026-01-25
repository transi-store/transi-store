import {
  Heading,
  VStack,
  Button,
  Box,
  Text,
  Input,
  IconButton,
  Alert,
  Code,
  HStack,
} from "@chakra-ui/react";
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogCloseTrigger,
  DialogBackdrop,
  DialogPositioner,
  Portal,
} from "@chakra-ui/react";
import { useLoaderData, Form, useActionData } from "react-router";
import React from "react";
import { LuPlus, LuTrash2, LuCopy, LuTriangleAlert } from "react-icons/lu";
import type { Route } from "./+types/orgs.$orgSlug.settings";
import { requireUser } from "~/lib/session.server";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import {
  getOrganizationApiKeys,
  createApiKey,
  deleteApiKey,
} from "~/lib/api-keys.server";
import { redirect } from "react-router";
import { toaster } from "~/components/ui/toaster";

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireUser(request);
  const organization = await requireOrganizationMembership(
    user,
    params.orgSlug,
  );

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create-api-key") {
    const name = formData.get("name") as string | null;

    const { keyValue } = await createApiKey({
      organizationId: organization.id,
      name: name || undefined,
      createdBy: user.userId,
    });

    // Retourner la clé nouvellement créée pour l'afficher à l'utilisateur
    return { success: true, keyValue, action: "create" };
  }

  if (intent === "delete-api-key") {
    const keyId = formData.get("keyId") as string;

    await deleteApiKey(keyId, organization.id);

    return redirect(`/orgs/${params.orgSlug}/settings`);
  }

  return { success: false, error: "Invalid intent" };
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const organization = await requireOrganizationMembership(
    user,
    params.orgSlug,
  );

  // Récupérer les clés d'API de l'organisation
  const apiKeys = await getOrganizationApiKeys(organization.id);

  return { organization, apiKeys };
}

export default function OrganizationSettings() {
  const { organization, apiKeys } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const handleCopyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      toaster.success({
        title: "Clé copiée",
        description: "La clé d'API a été copiée dans le presse-papiers",
        duration: 3000,
      });
    } catch (error) {
      toaster.error({
        title: "Erreur",
        description: "Impossible de copier la clé dans le presse-papiers",
        duration: 3000,
      });
    }
  };

  // Fermer la modale après création réussie
  React.useEffect(() => {
    if (actionData?.action === "create" && actionData.success) {
      setIsDialogOpen(false);
    }
  }, [actionData]);

  return (
    <Box pt={6}>
      <Heading as="h2" size="lg" mb={4}>
        Paramètres
      </Heading>

      <VStack align="stretch" gap={6}>
        {/* Section Clés d'API */}
        <Box>
          <Heading as="h3" size="md" mb={4}>
            Clés d'API
          </Heading>
          <Text color="gray.600" mb={4}>
            Les clés d'API permettent d'exporter les traductions de manière
            automatisée (CI/CD, scripts).
          </Text>

          {/* Affichage de la clé nouvellement créée */}
          {actionData?.action === "create" && actionData.keyValue && (
            <Alert.Root status="success" mb={4}>
              <Alert.Indicator>
                <LuTriangleAlert />
              </Alert.Indicator>
              <Alert.Content>
                <Alert.Title>Clé d'API créée avec succès</Alert.Title>
                <Alert.Description>
                  <VStack align="stretch" gap={2} mt={2}>
                    <Text fontSize="sm">
                      Copiez cette clé maintenant, elle ne sera plus affichée.
                    </Text>
                    <HStack>
                      <Code
                        p={2}
                        borderRadius="md"
                        fontSize="sm"
                        flex={1}
                        wordBreak="break-all"
                      >
                        {actionData.keyValue}
                      </Code>
                      <Button
                        size="sm"
                        onClick={() => handleCopyKey(actionData.keyValue!)}
                        colorPalette="gray"
                      >
                        <LuCopy /> Copier
                      </Button>
                    </HStack>
                  </VStack>
                </Alert.Description>
              </Alert.Content>
            </Alert.Root>
          )}

          {/* Liste des clés existantes */}
          {apiKeys.length === 0 ? (
            <Box
              p={6}
              textAlign="center"
              borderWidth={1}
              borderRadius="lg"
              mb={4}
            >
              <Text color="gray.600" mb={3}>
                Aucune clé d'API créée pour le moment
              </Text>
            </Box>
          ) : (
            <VStack align="stretch" gap={2}>
              {apiKeys.map((key) => (
                <Box key={key.id} p={4} borderWidth={1} borderRadius="md">
                  <HStack justify="space-between">
                    <Box flex={1}>
                      <Text fontWeight="medium">
                        {key.name || "Clé sans nom"}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        Créée le {new Date(key.createdAt).toLocaleDateString()}
                        {key.lastUsedAt && (
                          <>
                            {" • "}
                            Dernière utilisation:{" "}
                            {new Date(key.lastUsedAt).toLocaleDateString()}
                          </>
                        )}
                      </Text>
                    </Box>
                    <Form method="post">
                      <input
                        type="hidden"
                        name="intent"
                        value="delete-api-key"
                      />
                      <input type="hidden" name="keyId" value={key.id} />
                      <IconButton
                        type="submit"
                        variant="ghost"
                        colorPalette="red"
                        size="sm"
                        aria-label="Supprimer"
                        title="Supprimer cette clé"
                      >
                        <LuTrash2 />
                      </IconButton>
                    </Form>
                  </HStack>
                </Box>
              ))}
            </VStack>
          )}

          {/* Bouton pour ajouter une clé */}
          <Button
            onClick={() => setIsDialogOpen(true)}
            colorPalette="brand"
            size="sm"
            variant="outline"
            mb={6}
          >
            <LuPlus /> Ajouter une clé d'API
          </Button>

          {/* Modale de création de clé d'API */}
          <DialogRoot
            open={isDialogOpen}
            onOpenChange={(e) => setIsDialogOpen(e.open)}
          >
            <Portal>
              <DialogBackdrop />
              <DialogPositioner>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Créer une clé d'API</DialogTitle>
                  </DialogHeader>
                  <DialogCloseTrigger />
                  <Form method="post">
                    <input type="hidden" name="intent" value="create-api-key" />
                    <DialogBody pb={6}>
                      <VStack align="stretch" gap={4}>
                        <Box>
                          <Text fontSize="sm" fontWeight="medium" mb={2}>
                            Nom de la clé (optionnel)
                          </Text>
                          <Input
                            name="name"
                            placeholder="Ex: CI/CD Production"
                            maxLength={255}
                          />
                          <Text fontSize="xs" color="gray.600" mt={1}>
                            Un nom pour identifier facilement cette clé
                          </Text>
                        </Box>
                      </VStack>
                    </DialogBody>
                    <DialogFooter gap={3}>
                      <Button
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Annuler
                      </Button>
                      <Button type="submit" colorPalette="brand">
                        <LuPlus /> Créer
                      </Button>
                    </DialogFooter>
                  </Form>
                </DialogContent>
              </DialogPositioner>
            </Portal>
          </DialogRoot>

          {/* Documentation d'utilisation */}
          <Box mt={6} p={4} borderWidth={1} borderRadius="lg" bg="gray.50">
            <Heading as="h4" size="sm" mb={2}>
              Comment utiliser une clé d'API ?
            </Heading>
            <Text fontSize="sm" color="gray.700" mb={2}>
              Utilisez le header <Code>Authorization: Bearer YOUR_API_KEY</Code>{" "}
              dans vos requêtes HTTP :
            </Text>
            <Code
              display="block"
              p={3}
              borderRadius="md"
              fontSize="xs"
              whiteSpace="pre-wrap"
              wordBreak="break-all"
            >
              {`curl -H "Authorization: Bearer YOUR_API_KEY" \\
  "https://your-domain.com/api/orgs/${organization.slug}/projects/PROJECT_SLUG/export?format=json&locale=fr"`}
            </Code>
          </Box>
        </Box>
      </VStack>
    </Box>
  );
}

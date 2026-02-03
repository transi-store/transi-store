import { Heading, VStack, Box } from "@chakra-ui/react";
import { useLoaderData, useActionData } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types";
import { requireUser } from "~/lib/session.server";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import {
  getOrganizationApiKeys,
  createApiKey,
  deleteApiKey,
} from "~/lib/api-keys.server";
import {
  getOrganizationAiProviders,
  saveAiProvider,
  setActiveAiProvider,
  deleteAiProvider,
} from "~/lib/ai-providers.server";
import type { AiProviderEnum } from "~/lib/ai-providers";
import { redirect } from "react-router";
import { getOrigin } from "~/lib/origin.server";
import { getInstance } from "~/middleware/i18next";
import ApiKeys from "./ApiKeys";
import AiTranslation from "./AiTranslation";

export async function action({ request, params, context }: Route.ActionArgs) {
  const i18next = getInstance(context);
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
    const keyId = parseInt(formData.get("keyId") as string, 10);

    await deleteApiKey(keyId, organization.id);

    return redirect(`/orgs/${params.orgSlug}/settings`);
  }

  if (intent === "save-ai-provider") {
    // TODO not really type safe
    const provider = formData.get("provider") as AiProviderEnum;
    const apiKey = formData.get("apiKey") as string;

    if (!provider || !apiKey) {
      return {
        success: false,
        error: i18next.t("settings.errors.providerApiRequired"),
      };
    }

    await saveAiProvider({
      organizationId: organization.id,
      provider,
      apiKey,
    });

    return { success: true, action: "save-ai-provider", provider };
  }

  if (intent === "activate-ai-provider") {
    const provider = formData.get("provider") as AiProviderEnum;

    await setActiveAiProvider(organization.id, provider);

    return redirect(`/orgs/${params.orgSlug}/settings`);
  }

  if (intent === "delete-ai-provider") {
    const provider = formData.get("provider") as AiProviderEnum;

    await deleteAiProvider(organization.id, provider);

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

  // Récupérer les providers IA configurés
  const aiProviders = await getOrganizationAiProviders(organization.id);

  return { organization, apiKeys, aiProviders, origin: getOrigin(request) };
}

export default function OrganizationSettings() {
  const { t } = useTranslation();
  const { organization, apiKeys, aiProviders, origin } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <Box pt={6}>
      <Heading as="h2" size="lg" mb={4}>
        {t("settings.title")}
      </Heading>

      <VStack align="stretch" gap={6}>
        {/* Section Clés d'API */}
        <ApiKeys
          apiKeys={apiKeys}
          newKeyValue={
            actionData?.action === "create" ? actionData.keyValue : undefined
          }
          organizationSlug={organization.slug}
          origin={origin}
        />

        {/* Section Configuration IA */}
        <AiTranslation
          aiProviders={aiProviders}
          actionSuccess={
            actionData?.action === "save-ai-provider" && actionData.success
          }
        />
      </VStack>
    </Box>
  );
}

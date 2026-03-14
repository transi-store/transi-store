import { Heading, VStack, Box } from "@chakra-ui/react";
import { useLoaderData, useActionData, useNavigation } from "react-router";
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
  getOrganizationAiProvider,
} from "~/lib/ai-providers.server";
import type { AiProviderEnum } from "~/lib/ai-providers";
import { redirect } from "react-router";
import { getOrigin } from "~/lib/origin.server";
import { getInstance } from "~/middleware/i18next";
import ApiKeys from "./ApiKeys";
import AiTranslation from "./AiTranslation";

type AiProviderActionError = {
  success: false;
  error: string;
};

export type AiProviderActionData =
  | { success: true; keyValue: string; action: "create" }
  | { success: true; action: "save-ai-provider"; provider: AiProviderEnum }
  | AiProviderActionError;

export function isErrorReturnType(
  data: AiProviderActionData | undefined,
): data is AiProviderActionError {
  return (
    typeof data === "object" && "success" in data && data.success === false
  );
}

export async function action({
  request,
  params,
  context,
}: Route.ActionArgs): Promise<AiProviderActionData | Response> {
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
    const apiKey = (formData.get("apiKey") as string) || undefined;
    const model = formData.get("model") as string | null;

    if (!provider) {
      return {
        success: false,
        error: i18next.t("settings.errors.providerApiRequired"),
      };
    }

    // apiKey is required only when the provider is not yet configured
    if (!apiKey) {
      const existingProvider = await getOrganizationAiProvider(
        organization.id,
        provider,
      );
      const isAlreadyConfigured = !!existingProvider;

      if (!isAlreadyConfigured) {
        return {
          success: false,
          error: i18next.t("settings.errors.providerApiRequired"),
        };
      }
    }

    await saveAiProvider({
      organizationId: organization.id,
      provider,
      apiKey,
      model,
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
  const navigation = useNavigation();

  const newKeyValue =
    actionData?.success && actionData?.action === "create"
      ? actionData.keyValue
      : undefined;

  return (
    <Box pt={6}>
      <Heading as="h2" size="lg" mb={4}>
        {t("settings.title")}
      </Heading>

      <VStack align="stretch" gap={6}>
        {/* Section Clés d'API */}
        <ApiKeys
          key={newKeyValue}
          apiKeys={apiKeys}
          newKeyValue={newKeyValue}
          organizationSlug={organization.slug}
          origin={origin}
          isSubmitting={navigation.state === "submitting"}
        />

        {/* Section Configuration IA */}
        <AiTranslation aiProviders={aiProviders} />
      </VStack>
    </Box>
  );
}

import { VStack } from "@chakra-ui/react";
import { AI_PROVIDERS, AiProviderEnum } from "~/lib/ai-providers";
import { AiTranslationProviderItem } from "./AiTranslationProviderItem";
import type { OrganizationAiProvider } from "../../../../drizzle/schema";

type AiTranslationProvidersListProps = {
  aiProviders: Array<Pick<OrganizationAiProvider, "provider" | "isActive">>;
  onConfigure: (provider: AiProviderEnum) => void;
};

export function AiTranslationProvidersList({
  aiProviders,
  onConfigure,
}: AiTranslationProvidersListProps) {
  return (
    <VStack align="stretch" gap={2} mb={4}>
      {AI_PROVIDERS.map((providerInfo) => {
        const configured = aiProviders.find(
          (p) => p.provider === providerInfo.value,
        );

        return (
          <AiTranslationProviderItem
            key={providerInfo.value}
            providerInfo={providerInfo}
            configured={configured}
            onConfigure={onConfigure}
          />
        );
      })}
    </VStack>
  );
}

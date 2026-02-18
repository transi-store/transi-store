/**
 * Types et constantes partagés pour les providers IA.
 * Ce fichier peut être importé côté client et serveur.
 */

export enum AiProviderEnum {
  OPENAI = "openai",
  GEMINI = "gemini",
  FAKE = "fake",
}

export type AiProviderConfig = {
  value: AiProviderEnum;
  name: string;
  configureUrl: string;
  apiKeyPlaceholder: string;
};

export const AI_PROVIDERS: Array<AiProviderConfig> = [
  {
    value: AiProviderEnum.OPENAI,
    name: "OpenAI (GPT)",
    configureUrl: "https://platform.openai.com/api-keys",
    apiKeyPlaceholder: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  },
  {
    value: AiProviderEnum.GEMINI,
    name: "Google Gemini",
    configureUrl: "https://aistudio.google.com/apikey",
    apiKeyPlaceholder: "AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  },
];

// Dev-only fake provider — not shown in production
if (process.env.NODE_ENV !== "production") {
  AI_PROVIDERS.push({
    value: AiProviderEnum.FAKE,
    name: "Fake (dev only)",
    configureUrl: "",
    apiKeyPlaceholder: "any-value",
  });
}

export function getAiProvider(provider: AiProviderEnum): AiProviderConfig {
  const config = AI_PROVIDERS.find((p) => p.value === provider);

  if (!config) {
    throw new Error(`AI provider not found: ${provider}`);
  }

  return config;
}

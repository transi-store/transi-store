/**
 * Types et constantes partagés pour les providers IA.
 * Ce fichier peut être importé côté client et serveur.
 */

export enum AiProviderEnum {
  OPENAI = "openai",
  GEMINI = "gemini",
  FAKE = "fake",
}

export type AiModelOption = {
  value: string;
  label: string;
};

export type AiProviderConfig = {
  value: AiProviderEnum;
  name: string;
  configureUrl: string;
  apiKeyPlaceholder: string;
  models: Array<AiModelOption>;
};

export const AI_PROVIDERS: Array<AiProviderConfig> = [
  {
    value: AiProviderEnum.OPENAI,
    name: "OpenAI (GPT)",
    configureUrl: "https://platform.openai.com/api-keys",
    apiKeyPlaceholder: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    models: [
      // TODO translate labels
      { value: "gpt-5-mini", label: "GPT-5 Mini (cheap)" },
      { value: "gpt-5-nano", label: "GPT-5 Nano (ultra-cheap)" },
      { value: "gpt-5.1", label: "GPT-5.1 (correct, medium price)" },
      { value: "gpt-5.4", label: "GPT-5.4 (high accuracy, expensive)" },
    ],
  },
  {
    value: AiProviderEnum.GEMINI,
    name: "Google Gemini",
    configureUrl: "https://aistudio.google.com/apikey",
    apiKeyPlaceholder: "AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    models: [
      {
        value: "gemini-3-flash-preview",
        label: "Gemini 3 Flash (fast, medium accuracy, medium cost)",
      },
      {
        value: "gemini-3.1-flash-lite-preview",
        label: "Gemini 3.1 Flash Lite (fast, low accuracy, low cost)",
      },
      {
        value: "gemini-3.1-pro-preview",
        label: "Gemini 3.1 Pro (high accuracy, slower, expensive)",
      },
    ],
  },
];

// Dev-only fake provider — not shown in production
if (process.env.NODE_ENV !== "production") {
  AI_PROVIDERS.push({
    value: AiProviderEnum.FAKE,
    name: "Fake (dev only)",
    configureUrl: "",
    apiKeyPlaceholder: "any-value",
    models: [
      {
        value: "fake-model-fast",
        label: "Fake Model fast",
      },
      {
        value: "fake-model-slow",
        label: "Fake Model slow",
      },
    ],
  });
}

export function getAiProvider(provider: AiProviderEnum): AiProviderConfig {
  const config = AI_PROVIDERS.find((p) => p.value === provider);

  if (!config) {
    throw new Error(`AI provider not found: ${provider}`);
  }

  return config;
}

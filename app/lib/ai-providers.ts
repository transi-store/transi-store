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
      { value: "gpt-4o", label: "GPT-4o" },
      { value: "gpt-4o-mini", label: "GPT-4o mini" },
      { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    ],
  },
  {
    value: AiProviderEnum.GEMINI,
    name: "Google Gemini",
    configureUrl: "https://aistudio.google.com/apikey",
    apiKeyPlaceholder: "AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    models: [
      { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
      { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
      { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
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
    models: [],
  });
}

export function getAiProvider(provider: AiProviderEnum): AiProviderConfig {
  const config = AI_PROVIDERS.find((p) => p.value === provider);

  if (!config) {
    throw new Error(`AI provider not found: ${provider}`);
  }

  return config;
}

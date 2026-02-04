/**
 * Types et constantes partagés pour les providers IA.
 * Ce fichier peut être importé côté client et serveur.
 */

export enum AiProviderEnum {
  OPENAI = "openai",
  GEMINI = "gemini",
}

// TODO use a ICU translated value and use only the enum
export const AI_PROVIDERS: Array<{ value: AiProviderEnum; label: string }> = [
  { value: AiProviderEnum.OPENAI, label: "OpenAI (GPT)" },
  { value: AiProviderEnum.GEMINI, label: "Google Gemini" },
];

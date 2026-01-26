/**
 * Types et constantes partagés pour les providers IA.
 * Ce fichier peut être importé côté client et serveur.
 */

export type AiProvider = "openai" | "gemini";

export const AI_PROVIDERS: { value: AiProvider; label: string }[] = [
  { value: "openai", label: "OpenAI (GPT)" },
  { value: "gemini", label: "Google Gemini" },
];

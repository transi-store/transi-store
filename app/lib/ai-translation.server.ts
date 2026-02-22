import { generateText, Output } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createFakeModel } from "./fake-ai-provider.server";
import { AiProviderEnum } from "./ai-providers";
import { z } from "zod";

// 1. Définition du schéma Zod
const SuggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      text: z.string(),
      confidence: z.number(),
      notes: z.string().nullable(),
    }),
  ),
});

type TranslationContext = {
  sourceText: string;
  sourceLocale: string;
  targetLocale: string;
  existingTranslations: { locale: string; value: string }[];
  keyDescription?: string;
};

export type TranslationSuggestion = z.infer<
  typeof SuggestionSchema
>["suggestions"][number];

/**
 * Construit le prompt système pour la traduction ICU
 */
function buildSystemPrompt(): string {
  return `Tu es un traducteur professionnel spécialisé dans la localisation d'applications.
Le texte à traduire utilise le format ICU MessageFormat.
Tu dois préserver exactement :
- Les variables simples : {username}, {count}, {date}
- Les pluriels : {count, plural, one {# item} other {# items}}
- Les sélections : {gender, select, male {He} female {She} other {They}}
- Les formats : {date, date, short}, {amount, number, currency}
- Toute autre construction ICU

IMPORTANT :
- Ne traduis PAS le contenu des accolades qui représente des noms de variables
- Préserve la structure ICU exacte
- Adapte naturellement le texte à la langue cible
- Propose 2-3 variantes quand c'est pertinent (formulation différente, registre formel/informel)

Réponds UNIQUEMENT au format JSON suivant :
{
  "suggestions": [
    { "text": "traduction 1", "confidence": 0.95, notes: "pourquoi cette traduction en particulier ?" },
    { "text": "traduction alternative", "confidence": 0.85, notes: "cette traduction peut être meilleure dans tel contexte." }
  ]
}

Les clés "notes" DOIVENT être dans la langue du texte source.
  
`;
}

/**
 * Construit le prompt utilisateur avec le contexte de traduction
 */
function buildUserPrompt(context: TranslationContext): string {
  let prompt = `Traduis le texte suivant de "${context.sourceLocale}" vers "${context.targetLocale}".

Texte source :
${context.sourceText}`;

  if (context.keyDescription) {
    prompt += `

Description/contexte de la clé :
${context.keyDescription}`;
  }

  if (context.existingTranslations.length > 0) {
    prompt += `

Traductions existantes (pour le contexte) :`;
    for (const t of context.existingTranslations) {
      if (t.locale === context.targetLocale) {
        continue;
      }

      prompt += `
- ${t.locale}: ${t.value}`;
    }
  }

  return prompt;
}

async function callGenerateText({
  context,
  model,
  extraParameters,
}: {
  context: TranslationContext;
  model: any;
  extraParameters?: Record<string, any>;
}): Promise<TranslationSuggestion[]> {
  const { output } = await generateText({
    ...extraParameters,
    model,
    prompt: `${buildSystemPrompt()} \n\n ${buildUserPrompt(context)}`,
    output: Output.object({
      schema: SuggestionSchema,
    }),
  });

  return output.suggestions;
}

/**
 * Traduit avec OpenAI GPT
 */
async function translateWithOpenAI(
  context: TranslationContext,
  apiKey: string,
): Promise<TranslationSuggestion[]> {
  const openai = createOpenAI({ apiKey });

  return callGenerateText({ context, model: openai("gpt-5-mini") });
}

/**
 * Traduit avec Google Gemini
 */
async function translateWithGemini(
  context: TranslationContext,
  apiKey: string,
): Promise<TranslationSuggestion[]> {
  const google = createGoogleGenerativeAI({ apiKey });

  return callGenerateText({
    context,
    model: google("gemini-3-flash-preview"),
    extraParameters: { temperature: 0.7 },
  });
}

/**
 * Traduit avec le provider fake (dev seulement)
 */
async function translateWithFake(
  context: TranslationContext,
): Promise<TranslationSuggestion[]> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Fake AI provider is not available in production");
  }

  return callGenerateText({ context, model: createFakeModel() });
}

/**
 * Traduit un texte ICU avec le provider IA spécifié
 */
export async function translateWithAI(
  context: TranslationContext,
  provider: AiProviderEnum,
  apiKey: string,
): Promise<TranslationSuggestion[]> {
  switch (provider) {
    case AiProviderEnum.OPENAI:
      return translateWithOpenAI(context, apiKey);
    case AiProviderEnum.GEMINI:
      return translateWithGemini(context, apiKey);
    case AiProviderEnum.FAKE:
      return translateWithFake(context);
    default:
      throw new Error(`Provider IA non supporté: ${provider}`);
  }
}

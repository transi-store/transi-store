import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import type { AiProvider } from "./ai-providers";

export interface TranslationContext {
  sourceText: string;
  sourceLocale: string;
  targetLocale: string;
  existingTranslations: { locale: string; value: string }[];
  keyDescription?: string;
}

export interface TranslationSuggestion {
  text: string;
  confidence?: number;
}

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
    { "text": "traduction 1", "confidence": 0.95 },
    { "text": "traduction alternative", "confidence": 0.85 }
  ]
}`;
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

/**
 * Traduit avec OpenAI GPT
 */
async function translateWithOpenAI(
  context: TranslationContext,
  apiKey: string,
): Promise<TranslationSuggestion[]> {
  const openai = new OpenAI({ apiKey });

  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
    messages: [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: buildUserPrompt(context) },
    ],
    temperature: 0.7,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Réponse vide d'OpenAI");
  }

  const parsed = JSON.parse(content) as {
    suggestions: TranslationSuggestion[];
  };
  return parsed.suggestions;
}

/**
 * Traduit avec Google Gemini
 */
async function translateWithGemini(
  context: TranslationContext,
  apiKey: string,
): Promise<TranslationSuggestion[]> {
  const genai = new GoogleGenAI({ apiKey });

  const response = await genai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `${buildSystemPrompt()}

${buildUserPrompt(context)}`,
    config: {
      temperature: 0.7,
      responseMimeType: "application/json",
    },
  });

  const content = response.text;
  if (!content) {
    throw new Error("Réponse vide de Gemini");
  }

  const parsed = JSON.parse(content) as {
    suggestions: TranslationSuggestion[];
  };

  console.log(content);

  return parsed.suggestions;
}

/**
 * Traduit un texte ICU avec le provider IA spécifié
 */
export async function translateWithAI(
  context: TranslationContext,
  provider: AiProvider,
  apiKey: string,
): Promise<TranslationSuggestion[]> {
  switch (provider) {
    case "openai":
      return translateWithOpenAI(context, apiKey);
    case "gemini":
      return translateWithGemini(context, apiKey);
    default:
      throw new Error(`Provider IA non supporté: ${provider}`);
  }
}

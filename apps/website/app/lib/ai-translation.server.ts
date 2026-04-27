import { generateText, Output } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createFakeModel } from "./fake-ai-provider.server";
import { AiProviderEnum, getAiProvider } from "./ai-providers";
import { z } from "zod";

const SuggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      text: z.string(),
      confidence: z.number(),
      notes: z.string().nullable(),
    }),
  ),
});

export type TranslationFormat = "icu" | "markdown" | "mdx";

type TranslationContext = {
  sourceText: string;
  sourceLocale: string;
  targetLocale: string;
  existingTranslations: { locale: string; value: string }[];
  keyDescription?: string;
  /**
   * Translation format. Defaults to "icu" which keeps the legacy ICU
   * MessageFormat prompt. "markdown" / "mdx" switch to a markdown-aware
   * prompt that preserves headings, code, links and (for MDX) JSX.
   */
  format?: TranslationFormat;
  /**
   * Current target-locale content used as a wording reference (tone,
   * terminology). Not the thing to translate — only context. Useful when
   * translating a section of a markdown document so the AI matches the
   * style already used in that locale.
   */
  targetCurrentText?: string;
};

export type TranslationSuggestion = z.infer<
  typeof SuggestionSchema
>["suggestions"][number];

function buildIcuSystemPrompt(): string {
  return `You are a professional translator specialized in app localization.
The text to translate uses the ICU MessageFormat.
You must preserve EXACTLY:
- Simple variables: {username}, {count}, {date}
- Plurals: {count, plural, one {# item} other {# items}}
- Selects: {gender, select, male {He} female {She} other {They}}
- Formats: {date, date, short}, {amount, number, currency}
- Any other ICU construct

IMPORTANT:
- Do NOT translate the content inside braces — these are variable names
- Preserve the exact ICU structure
- Naturally adapt the text to the target language
- Propose 2-3 variants when relevant (different phrasings, formal/informal register)

Reply ONLY in the following JSON format:
{
  "suggestions": [
    { "text": "translation 1", "confidence": 0.95, "notes": "why this translation in particular?" },
    { "text": "alternative translation", "confidence": 0.85, "notes": "this translation may be better in this context." }
  ]
}

The "notes" field MUST be written in the language of the source text.
`;
}

function buildMarkdownSystemPrompt(isMdx: boolean): string {
  return `You are a professional translator specialized in technical documentation.
The text to translate is in Markdown${isMdx ? " / MDX" : ""} format.

You must preserve EXACTLY:
- The heading structure (#, ##, ### …) and the heading level
- Fenced code blocks delimited by \`\`\` (the content stays unchanged)
- Inline code between backticks
- Links [text](url) — translate the text, keep the URL as-is
- Images ![alt](url) — translate the alt, keep the URL
- Lists, blockquotes (>) and tables
- Bold (**), italic (*), strikethrough (~~) formatting${
    isMdx
      ? `
- JSX components (<Component .../>) and expressions {expr}: leave them intact, do NOT translate their names or props unless they contain natural-language text`
      : ""
  }

IMPORTANT:
- Naturally adapt the text to the target language
- Keep the source tone and register
- Keep paragraph length reasonably close to the source
- Do not change the order of sections
- Propose 2-3 variants when relevant (different phrasings, formal/informal register)

Reply ONLY in the following JSON format:
{
  "suggestions": [
    { "text": "translation 1", "confidence": 0.95, "notes": "why this translation in particular?" },
    { "text": "alternative translation", "confidence": 0.85, "notes": "this translation may be better in this context." }
  ]
}

The "notes" field MUST be written in the language of the source text.
`;
}

function buildSystemPrompt(format: TranslationFormat): string {
  if (format === "markdown" || format === "mdx") {
    return buildMarkdownSystemPrompt(format === "mdx");
  }
  return buildIcuSystemPrompt();
}

function buildUserPrompt(context: TranslationContext): string {
  let prompt = `Translate the following text from "${context.sourceLocale}" to "${context.targetLocale}".

Source text:
${context.sourceText}`;

  if (context.keyDescription) {
    prompt += `

Key description / context:
${context.keyDescription}`;
  }

  if (context.existingTranslations.length > 0) {
    const others = context.existingTranslations.filter(
      (t) => t.locale !== context.targetLocale,
    );
    if (others.length > 0) {
      prompt += `

Existing translations (for context only):`;
      for (const t of others) {
        prompt += `
- ${t.locale}: ${t.value}`;
      }
    }
  }

  if (
    context.targetCurrentText &&
    context.targetCurrentText.trim().length > 0
  ) {
    prompt += `

Current ${context.targetLocale} draft (use only for tone and terminology consistency, do not copy verbatim):
${context.targetCurrentText}`;
  }

  return prompt;
}

async function callGenerateText({
  context,
  model,
  extraParameters,
}: {
  context: TranslationContext;
  model: Parameters<typeof generateText>[0]["model"];
  extraParameters?: Record<string, unknown>;
}): Promise<TranslationSuggestion[]> {
  const format = context.format ?? "icu";
  const { output } = await generateText({
    ...extraParameters,
    model,
    prompt: `${buildSystemPrompt(format)} \n\n ${buildUserPrompt(context)}`,
    output: Output.object({
      schema: SuggestionSchema,
    }),
  });

  return output.suggestions;
}

async function translateWithOpenAI(
  context: TranslationContext,
  apiKey: string,
  model?: string | null,
): Promise<TranslationSuggestion[]> {
  const openai = createOpenAI({ apiKey });
  const modelId = model ?? getAiProvider(AiProviderEnum.OPENAI).models[0].value;

  return callGenerateText({ context, model: openai(modelId) });
}

async function translateWithGemini(
  context: TranslationContext,
  apiKey: string,
  model?: string | null,
): Promise<TranslationSuggestion[]> {
  const google = createGoogleGenerativeAI({ apiKey });
  const modelId = model ?? getAiProvider(AiProviderEnum.GEMINI).models[0].value;

  return callGenerateText({
    context,
    model: google(modelId),
    extraParameters: { temperature: 0.7 },
  });
}

async function translateWithFake(
  context: TranslationContext,
  _apiKey: string,
  model?: string | null,
): Promise<TranslationSuggestion[]> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Fake AI provider is not available in production");
  }

  const modelId = model ?? getAiProvider(AiProviderEnum.FAKE).models[0].value;

  return callGenerateText({ context, model: createFakeModel(modelId) });
}

const MarkdownTranslationSchema = z.object({
  translatedText: z.string(),
});

type MarkdownDocumentTranslationContext = {
  sourceText: string;
  sourceLocale: string;
  targetLocale: string;
  isMdx: boolean;
  /** Existing target-locale draft, used only as a tone/terminology reference. */
  targetCurrentText?: string;
};

function buildMarkdownDocumentSystemPrompt(isMdx: boolean): string {
  return `You are a professional translator specialized in technical documentation.
The text to translate is a full ${isMdx ? "MDX" : "Markdown"} document.

You must preserve EXACTLY:
- The heading structure (#, ##, ### …) and the heading level
- Fenced code blocks delimited by \`\`\` (the content stays unchanged)
- Inline code between backticks
- Links [text](url) — translate the text, keep the URL
- Images ![alt](url) — translate the alt, keep the URL
- Lists, blockquotes (>) and tables
- Bold (**), italic (*), strikethrough (~~) formatting${
    isMdx
      ? `
- JSX components (<Component .../>) and expressions {expr}: leave them intact, do NOT translate their names or props unless they contain natural-language text`
      : ""
  }

IMPORTANT:
- Naturally adapt the text to the target language
- Keep the source tone and register
- Keep paragraph length reasonably close to the source
- Do not change the order of sections

Reply ONLY in the following JSON format:
{ "translatedText": "<the translated markdown>" }
`;
}

function buildMarkdownDocumentUserPrompt(
  context: MarkdownDocumentTranslationContext,
): string {
  let prompt = `Translate the following markdown document from "${context.sourceLocale}" to "${context.targetLocale}".

Source document:
${context.sourceText}`;

  if (
    context.targetCurrentText &&
    context.targetCurrentText.trim().length > 0
  ) {
    prompt += `

Current ${context.targetLocale} draft (use only for tone and terminology consistency, do not copy verbatim):
${context.targetCurrentText}`;
  }
  return prompt;
}

/**
 * Translate a full markdown / MDX document, preserving structure (headings,
 * code blocks, links, JSX). Returns a single translated text — not a list of
 * suggestions, because suggesting multiple variants of an entire document
 * is rarely useful and very expensive.
 */
export async function translateMarkdownWithAI(
  context: MarkdownDocumentTranslationContext,
  provider: {
    provider: AiProviderEnum;
    apiKey: string;
    model: string | null | undefined;
  },
): Promise<string> {
  const { provider: providerName, apiKey, model } = provider;

  const systemPrompt = buildMarkdownDocumentSystemPrompt(context.isMdx);
  const userPrompt = buildMarkdownDocumentUserPrompt(context);
  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

  const buildModel = () => {
    switch (providerName) {
      case AiProviderEnum.OPENAI: {
        const openai = createOpenAI({ apiKey });
        const modelId =
          model ?? getAiProvider(AiProviderEnum.OPENAI).models[0].value;
        return openai(modelId);
      }
      case AiProviderEnum.GEMINI: {
        const google = createGoogleGenerativeAI({ apiKey });
        const modelId =
          model ?? getAiProvider(AiProviderEnum.GEMINI).models[0].value;
        return google(modelId);
      }
      case AiProviderEnum.FAKE: {
        if (process.env.NODE_ENV === "production") {
          throw new Error("Fake AI provider is not available in production");
        }
        const modelId =
          model ?? getAiProvider(AiProviderEnum.FAKE).models[0].value;
        return createFakeModel(modelId);
      }
      default:
        throw new Error(`Unsupported AI provider: ${providerName}`);
    }
  };

  const { output } = await generateText({
    model: buildModel(),
    prompt: fullPrompt,
    output: Output.object({
      schema: MarkdownTranslationSchema,
    }),
  });

  return output.translatedText;
}

/**
 * Translate text via the configured AI provider. Returns 2-3 ranked
 * suggestions. The `format` field of the context selects the prompt:
 * "icu" (default) for translation keys, "markdown" / "mdx" for sections of
 * a markdown document.
 */
export async function translateWithAI(
  context: TranslationContext,
  provider: {
    provider: AiProviderEnum;
    apiKey: string;
    model: string | null | undefined;
  },
): Promise<TranslationSuggestion[]> {
  const { provider: providerName, apiKey, model } = provider;

  switch (providerName) {
    case AiProviderEnum.OPENAI:
      return translateWithOpenAI(context, apiKey, model);
    case AiProviderEnum.GEMINI:
      return translateWithGemini(context, apiKey, model);
    case AiProviderEnum.FAKE:
      return translateWithFake(context, apiKey, model);
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

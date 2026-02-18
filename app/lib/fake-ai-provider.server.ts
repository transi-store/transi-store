/**
 * Fake AI provider for development only.
 * Returns a hardcoded response after a short delay, so we can test the AI
 * translation UI without hitting a real LLM.
 *
 * This file MUST NOT be imported in production code paths.
 * Use `AiProviderEnum.FAKE` only when `NODE_ENV !== "production"`.
 */

import type {
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3FinishReason,
  LanguageModelV3StreamPart,
  LanguageModelV3Usage,
} from "@ai-sdk/provider";

const FAKE_DELAY_MS = 500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const STOP_FINISH_REASON: LanguageModelV3FinishReason = {
  unified: "stop",
  raw: "stop",
};

const FAKE_USAGE: LanguageModelV3Usage = {
  inputTokens: {
    total: 10,
    noCache: undefined,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: {
    total: 20,
    text: undefined,
    reasoning: undefined,
  },
};

/**
 * Extracts the target locale from the prompt text so the fake response can
 * mention it. Falls back to undefined when it cannot be determined.
 */
function extractTargetLocale(
  options: LanguageModelV3CallOptions,
): string | undefined {
  for (const message of options.prompt) {
    if (message.role === "user") {
      for (const part of message.content) {
        if (part.type === "text") {
          const match = part.text.match(/vers\s+"([^"]+)"/);
          if (match) return match[1];
        }
      }
    }
  }

  return undefined;
}

function buildFakeJsonResponse(targetLocale: string | undefined): string {
  const locale = targetLocale ?? "??";

  return JSON.stringify({
    suggestions: [
      {
        text: `[FAKE ${locale}] Fake translation 1`,
        confidence: 0.99,
        notes: "Fake provider — dev only",
      },
      {
        text: `[FAKE ${locale}] Fake translation 2`,
        confidence: 0.85,
        notes: "Alternative fake translation",
      },
    ],
  });
}

class FakeLanguageModel implements LanguageModelV3 {
  readonly specificationVersion = "v3" as const;
  readonly provider = "fake";
  readonly modelId: string;
  readonly supportedUrls: Record<string, RegExp[]> = {};

  constructor(modelId: string) {
    this.modelId = modelId;
  }

  async doGenerate(options: LanguageModelV3CallOptions) {
    await sleep(FAKE_DELAY_MS);

    const targetLocale = extractTargetLocale(options);
    const text = buildFakeJsonResponse(targetLocale);

    return {
      content: [{ type: "text" as const, text }],
      finishReason: STOP_FINISH_REASON,
      usage: FAKE_USAGE,
      warnings: [],
    };
  }

  async doStream(options: LanguageModelV3CallOptions) {
    const targetLocale = extractTargetLocale(options);
    const text = buildFakeJsonResponse(targetLocale);
    const textId = "fake-text-0";

    const stream = new ReadableStream<LanguageModelV3StreamPart>({
      async start(controller) {
        await sleep(FAKE_DELAY_MS / 2);

        controller.enqueue({ type: "text-start", id: textId });

        for (const char of text) {
          await sleep(10);
          controller.enqueue({ type: "text-delta", id: textId, delta: char });
        }

        controller.enqueue({ type: "text-end", id: textId });

        controller.enqueue({
          type: "finish",
          finishReason: STOP_FINISH_REASON,
          usage: FAKE_USAGE,
        });

        controller.close();
      },
    });

    return { stream, warnings: [] };
  }
}

export function createFakeModel(modelId = "fake-model"): LanguageModelV3 {
  return new FakeLanguageModel(modelId);
}

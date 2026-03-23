import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { ImportStrategy } from "@transi-store/common/import-strategy";
import { SupportedFormat } from "~/lib/format/types";

extendZodWithOpenApi(z);

export const importFieldsSchema = (localeExample = "fr") =>
  z.object({
    locale: z.string().openapi({
      description:
        "Language code to import into (must match one of the project's configured languages).",
      example: localeExample,
    }),
    strategy: z.enum(ImportStrategy).openapi({
      description:
        "Import strategy. 'overwrite' updates existing translations. 'skip' only creates missing translations and leaves existing ones untouched.",
      example: ImportStrategy.OVERWRITE,
    }),
    format: z.enum(SupportedFormat).optional().openapi({
      description:
        "File format. Auto-detected from file extension if omitted (.json → json, .xliff/.xlf → xliff).",
      example: SupportedFormat.JSON,
    }),
    branch: z.string().optional().openapi({
      description:
        "Target branch slug. If the branch does not exist and has an open status, it will be created automatically. Omit to import into the main branch.",
      example: "feature-xyz",
    }),
  });

export const importSuccessResponseSchema = z
  .object({
    success: z.literal(true),
    stats: z.object({
      total: z.number().openapi({
        description: "Total number of entries processed from the file.",
        example: 42,
      }),
      keysCreated: z.number().openapi({
        description: "Number of new translation keys created.",
        example: 5,
      }),
      translationsCreated: z.number().openapi({
        description: "Number of new translations added.",
        example: 8,
      }),
      translationsUpdated: z.number().openapi({
        description:
          "Number of existing translations updated (only with 'overwrite' strategy).",
        example: 3,
      }),
      translationsSkipped: z.number().openapi({
        description:
          "Number of existing translations left untouched (only with 'skip' strategy).",
        example: 0,
      }),
    }),
  })
  .openapi("ImportSuccess");

export const importErrorResponseSchema = z
  .object({
    error: z.string().openapi({
      description: "Human-readable error message.",
      example: "Missing 'locale' field",
    }),
    details: z.string().optional().openapi({
      description: "Additional technical details about the error.",
    }),
  })
  .openapi("ImportError");

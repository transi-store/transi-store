import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
} from "@asteasolutions/zod-to-openapi";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { exportQuerySchema, exportErrorResponseSchema } from "./schemas/export";
import {
  importFieldsSchema,
  importSuccessResponseSchema,
  importErrorResponseSchema,
} from "./schemas/import";
import {
  getProjectLanguages,
  getProjectsForOrganization,
} from "../projects.server";
import type { SessionData } from "../session.server";

extendZodWithOpenApi(z);

export async function generateOpenApiDocument(user?: SessionData | null) {
  const registry = new OpenAPIRegistry();

  const projectList = user?.lastOrganizationId
    ? await getProjectsForOrganization(user.lastOrganizationId)
    : null;

  const defaultProject = projectList?.[0] ?? null;

  const languages = defaultProject?.id
    ? await getProjectLanguages(defaultProject.id)
    : null;

  const localeExample = languages?.[0]?.locale;

  // -- Security scheme --
  registry.registerComponent("securitySchemes", "BearerApiKey", {
    type: "http",
    scheme: "bearer",
    description:
      "API key generated from the organization settings page. Pass it as a Bearer token in the Authorization header.",
  });

  // -- Shared path parameters --
  const orgSlugParam = z.string().openapi({
    param: { name: "orgSlug", in: "path" },
    description: "Organization slug.",
    example: user?.lastOrganizationSlug ?? "my-org",
  });

  const projectSlugParam = z.string().openapi({
    param: { name: "projectSlug", in: "path" },
    description: "Project slug.",
    example: defaultProject?.slug ?? "my-project",
  });

  // -- Export endpoint --
  registry.registerPath({
    method: "get",
    path: "/api/orgs/{orgSlug}/projects/{projectSlug}/translations",
    summary: "Export translations",
    description:
      "Download translations for a single locale in JSON or XLIFF 2.0 format. " +
      "The response is returned as a file attachment.",
    tags: ["Translations"],
    security: [{ BearerApiKey: [] }],
    request: {
      params: z.object({
        orgSlug: orgSlugParam,
        projectSlug: projectSlugParam,
      }),
      query: exportQuerySchema(localeExample),
    },
    responses: {
      200: {
        description:
          "Translation file. Content-Type depends on the requested format: " +
          "`application/json` for JSON, `application/xml` for XLIFF.",
        headers: z.object({
          "Content-Disposition": z.string().openapi({
            description: "Suggested filename for the downloaded file.",
            example: 'attachment; filename="my-project-fr.json"',
          }),
        }),
        content: {
          "application/json": {
            schema: z.record(z.string(), z.string()).openapi({
              description: "Flat key → translation object.",
              example: {
                "home.title": "Accueil",
                "home.subtitle": "Bienvenue",
              },
            }),
          },
          "application/xml": {
            schema: z.string().openapi({
              description: "XLIFF 2.0 XML document.",
            }),
          },
        },
      },
      400: {
        description: "Invalid parameters (unknown format, missing locale, …).",
        content: {
          "application/json": { schema: exportErrorResponseSchema },
        },
      },
      401: {
        description: "Missing or invalid API key.",
        content: {
          "application/json": { schema: exportErrorResponseSchema },
        },
      },
      403: {
        description: "The API key does not belong to this organization.",
        content: {
          "application/json": { schema: exportErrorResponseSchema },
        },
      },
      404: {
        description: "Project not found.",
        content: {
          "application/json": { schema: exportErrorResponseSchema },
        },
      },
    },
  });

  // -- Import endpoint --

  const importFormSchema = importFieldsSchema(localeExample).extend({
    file: z.string().openapi({
      description:
        "Translation file to import (JSON or XLIFF 2.0). Maximum size: 5 MB.",
      format: "binary",
    }),
  });

  registry.registerPath({
    method: "post",
    path: "/api/orgs/{orgSlug}/projects/{projectSlug}/translations",
    summary: "Import translations",
    description:
      "Upload a translation file (JSON or XLIFF 2.0) for a single locale. " +
      "New keys are created automatically. " +
      "Use the `strategy` field to control whether existing translations are updated or skipped.",
    tags: ["Translations"],
    security: [{ BearerApiKey: [] }],
    request: {
      params: z.object({
        orgSlug: orgSlugParam,
        projectSlug: projectSlugParam,
      }),
      body: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: importFormSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Import completed successfully.",
        content: {
          "application/json": { schema: importSuccessResponseSchema },
        },
      },
      400: {
        description:
          "Validation error (missing field, unsupported format, unknown locale, …).",
        content: {
          "application/json": { schema: importErrorResponseSchema },
        },
      },
      401: {
        description: "Missing or invalid API key.",
        content: {
          "application/json": { schema: importErrorResponseSchema },
        },
      },
      403: {
        description: "The API key does not belong to this organization.",
        content: {
          "application/json": { schema: importErrorResponseSchema },
        },
      },
      404: {
        description: "Project not found.",
        content: {
          "application/json": { schema: importErrorResponseSchema },
        },
      },
      405: {
        description: "Method not allowed (only POST is accepted).",
        content: {
          "application/json": { schema: importErrorResponseSchema },
        },
      },
    },
  });

  // -- Generate document --
  const generator = new OpenApiGeneratorV31(registry.definitions);

  return generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: "Transi-Store API",
      version: "1.0.0",
      description:
        "REST API for managing translations in [Transi-Store](https://transi-store.com).\n\n" +
        "## Authentication\n\n" +
        "All endpoints require a **Bearer API key**. " +
        "You can generate one from your organization's settings page " +
        "(*Settings → API Keys*).\n\n" +
        "```\nAuthorization: Bearer <your-api-key>\n```\n\n" +
        "## CLI\n\n" +
        "For automated workflows (CI/CD, local development), use the " +
        "[`@transi-store/cli`](https://www.npmjs.com/package/@transi-store/cli) " +
        "command-line tool. It wraps these API endpoints and supports " +
        "batch operations via a configuration file.\n\n" +
        "```bash\nnpm install -g @transi-store/cli\n```\n\n" +
        "Read the full documentation on [npm](https://www.npmjs.com/package/@transi-store/cli).\n\n" +
        "## Formats\n\n" +
        "| Format | Content-Type | Extension | Description |\n" +
        "|--------|-------------|-----------|-------------|\n" +
        "| `json` | `application/json` | `.json` | Flat key → value object |\n" +
        "| `xliff` | `application/xml` | `.xliff` | XLIFF 2.0 XML document |\n",
    },
    servers: [{ url: "/", description: "Current server" }],
  });
}

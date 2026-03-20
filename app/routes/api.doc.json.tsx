import { generateOpenApiDocument } from "~/lib/api-doc/openapi.server";

export function loader() {
  const spec = generateOpenApiDocument();

  return new Response(JSON.stringify(spec, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

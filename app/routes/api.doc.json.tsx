import { generateOpenApiDocument } from "~/lib/api-doc/openapi.server";
import type { Route } from "./+types/pricing";
import { getUserFromSession } from "~/lib/session.server";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getUserFromSession(request);

  const spec = await generateOpenApiDocument(user);

  return new Response(JSON.stringify(spec, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

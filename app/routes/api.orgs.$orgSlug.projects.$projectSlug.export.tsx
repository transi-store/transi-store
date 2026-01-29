import type { Route } from "./+types/api.orgs.$orgSlug.projects.$projectSlug.export";
import { exportLoader } from "./api.orgs.$orgSlug.projects.$projectSlug.export.server";

export async function loader({ request, params }: Route.LoaderArgs) {
  return exportLoader({ request, params });
}

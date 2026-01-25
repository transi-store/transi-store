import type { Route } from "./+types/api.orgs.$orgSlug.projects.$projectSlug.export";
import { exportLoader } from "./api.orgs.$orgSlug.projects.$projectSlug.export.server";

export async function loader({ request, params }: Route.LoaderArgs) {
  return exportLoader({ request, params });
}

// Resource route - ce composant n'est jamais rendu car le loader retourne toujours une Response
export default function ExportRoute() {
  return null;
}

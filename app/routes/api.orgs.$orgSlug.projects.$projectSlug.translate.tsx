import type { Route } from "./+types/api.orgs.$orgSlug.projects.$projectSlug.translate";
import { action as translateAction } from "./api.orgs.$orgSlug.projects.$projectSlug.translate.server";

export async function action({ request, params }: Route.ActionArgs) {
  return translateAction({ request, params });
}

// Resource route - ce composant n'est jamais rendu car l'action retourne toujours une Response
export default function TranslateRoute() {
  return null;
}

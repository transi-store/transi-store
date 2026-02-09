import { redirect } from "react-router";
import type { Route } from "./+types/orgs.$orgSlug.projects.$projectSlug._index";
import { getTranslationsUrl } from "~/lib/routes-helpers";

export async function loader({ params }: Route.LoaderArgs) {
  throw redirect(getTranslationsUrl(params.orgSlug, params.projectSlug));
}

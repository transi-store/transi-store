import { redirect } from "react-router";
import type { Route } from "./+types/orgs.$orgSlug.projects.$projectSlug._index";

export async function loader({ params }: Route.LoaderArgs) {
  throw redirect(
    `/orgs/${params.orgSlug}/projects/${params.projectSlug}/translations`,
  );
}

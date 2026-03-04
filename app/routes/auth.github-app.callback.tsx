/**
 * Route de callback après l'installation de la GitHub App
 * GET /auth/github-app/callback
 *
 * GitHub redirige ici après l'installation avec :
 *   ?installation_id=<id>&setup_action=install|update
 *
 * L'orgSlug cible est passé via le query param `state` (stocké avant la redirection GitHub).
 */

import type { Route } from "./+types/auth.github-app.callback";
import { redirect } from "react-router";
import { requireUser } from "~/lib/session.server";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import { db, schema } from "~/lib/db.server";
import { eq } from "drizzle-orm";
import { listInstallationRepos } from "~/lib/github-app.server";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);

  const url = new URL(request.url);
  const installationId = url.searchParams.get("installation_id");
  const setupAction = url.searchParams.get("setup_action");
  const orgSlug = url.searchParams.get("state"); // on passe orgSlug dans le param state

  if (!installationId) {
    throw new Response("Missing installation_id parameter", { status: 400 });
  }

  if (!orgSlug) {
    throw new Response(
      "Missing state parameter (orgSlug). Please start the installation from transi-store.",
      { status: 400 },
    );
  }

  // Vérifier que l'utilisateur est membre de l'organisation
  const organization = await requireOrganizationMembership(user, orgSlug);

  console.log(
    `GitHub App callback: installationId=${installationId}, setupAction=${setupAction}, orgSlug=${orgSlug}, userId=${user.id}`,
  );

  // Récupérer le login du compte GitHub qui a installé l'App
  let accountLogin = "unknown";
  try {
    const repos = await listInstallationRepos(installationId);
    console.log(`Repos for installation ${installationId}:`, repos);
    if (repos.length > 0) {
      // Le full_name est "owner/repo", on prend la partie "owner"
      accountLogin = repos[0].full_name.split("/")[0];
    }
  } catch (e) {
    // Non bloquant : on peut récupérer le login plus tard via webhook
    console.error(
      `Failed to list repos for installation ${installationId}:`,
      e,
    );
  }

  if (setupAction === "install" || setupAction === "update") {
    // Insérer ou mettre à jour l'installation
    const existing = await db.query.githubAppInstallations.findFirst({
      where: { installationId },
    });

    if (existing) {
      await db
        .update(schema.githubAppInstallations)
        .set({
          organizationId: organization.id,
          accountLogin,
          updatedAt: new Date(),
        })
        .where(eq(schema.githubAppInstallations.id, existing.id));
    } else {
      await db.insert(schema.githubAppInstallations).values({
        installationId,
        organizationId: organization.id,
        accountLogin,
      });
    }
  }

  // Rediriger vers les settings de l'org
  return redirect(
    `/orgs/${orgSlug}/settings?github=installed&installation_id=${installationId}`,
  );
}

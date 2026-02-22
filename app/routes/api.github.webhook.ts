/**
 * Endpoint webhook GitHub App
 * POST /api/github/webhook
 *
 * Reçoit les événements GitHub et déclenche la synchronisation.
 * Événements gérés :
 *   - pull_request.opened / .synchronize → import source locale (3-way merge)
 *   - pull_request.closed (merged)        → push translations vers le repo
 *   - installation.created / .deleted     → gestion des installations
 */

import type { Route } from "./+types/api.github.webhook";
import { verifyWebhookSignature } from "~/lib/github-app.server";
import {
  syncPRFiles,
  pushTranslationsAfterMerge,
  getProjectConfigByRepo,
} from "~/lib/github-sync.server";
import { db, schema } from "~/lib/db.server";
import { eq } from "drizzle-orm";

// ─── Types GitHub Webhook ─────────────────────────────────────────────────────

type PullRequestEvent = {
  action:
    | "opened"
    | "synchronize"
    | "closed"
    | "reopened"
    | "edited"
    | string;
  number: number;
  pull_request: {
    head: { ref: string; sha: string };
    base: { ref: string };
    merged: boolean;
    merge_commit_sha: string | null;
  };
  repository: {
    full_name: string;
  };
  installation: {
    id: number;
  };
};

type InstallationEvent = {
  action: "created" | "deleted" | "suspend" | "unsuspend" | string;
  installation: {
    id: number;
    account: {
      login: string;
      type: "User" | "Organization";
    };
  };
};

// ─── Loader (n'est pas utilisé mais requis pour éviter l'erreur React Router) ──

export async function loader() {
  return new Response("Method Not Allowed", { status: 405 });
}

// ─── Action : réception du webhook ───────────────────────────────────────────

export async function action({ request }: Route.ActionArgs) {
  // Lire le corps brut pour la vérification de signature
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  // Vérifier la signature HMAC
  let signatureValid: boolean;
  try {
    signatureValid = verifyWebhookSignature(rawBody, signature);
  } catch (err) {
    console.error("[webhook] Erreur de vérification de signature:", err);
    return new Response("Internal Server Error", { status: 500 });
  }

  if (!signatureValid) {
    return new Response("Unauthorized: invalid signature", { status: 401 });
  }

  const event = request.headers.get("x-github-event");
  let payload: unknown;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Bad Request: invalid JSON", { status: 400 });
  }

  // Dispatcher selon le type d'événement (asynchrone, pas de await)
  // On répond 200 immédiatement et le traitement se fait en background
  handleEvent(event, payload).catch((err) => {
    console.error(`[webhook] Erreur lors du traitement de l'événement "${event}":`, err);
  });

  return new Response("OK", { status: 200 });
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function handleEvent(event: string | null, payload: unknown) {
  if (!event) return;

  switch (event) {
    case "pull_request":
      await handlePullRequestEvent(payload as PullRequestEvent);
      break;

    case "installation":
      await handleInstallationEvent(payload as InstallationEvent);
      break;

    default:
      // Événement non géré, ignorer silencieusement
      break;
  }
}

async function handlePullRequestEvent(payload: PullRequestEvent) {
  const { action, number: prNumber, pull_request, repository, installation } =
    payload;
  const repoFullName = repository.full_name;
  const githubInstallationId = String(installation.id);

  const config = await getProjectConfigByRepo(
    repoFullName,
    githubInstallationId,
  );

  if (!config) {
    // Ce repo n'est pas configuré dans transi-store → ignorer
    return;
  }

  if (action === "opened" || action === "synchronize" || action === "reopened") {
    const prBranch = pull_request.head.ref;

    await syncPRFiles(config, repoFullName, prNumber, prBranch);
    return;
  }

  if (action === "closed" && pull_request.merged) {
    const targetBranch = pull_request.base.ref;

    await pushTranslationsAfterMerge(config, repoFullName, targetBranch);
    return;
  }
}

async function handleInstallationEvent(payload: InstallationEvent) {
  const { action, installation } = payload;
  const githubInstallationId = String(installation.id);
  const accountLogin = installation.account.login;

  if (action === "created") {
    // L'installation est créée via le callback OAuth (auth.github-app.callback.tsx)
    // Ici on peut mettre à jour le login si nécessaire (ex: renommage du compte)
    const existing = await db.query.githubAppInstallations.findFirst({
      where: { installationId: githubInstallationId },
    });

    if (existing) {
      await db
        .update(schema.githubAppInstallations)
        .set({ accountLogin, updatedAt: new Date() })
        .where(eq(schema.githubAppInstallations.id, existing.id));
    }
    return;
  }

  if (action === "deleted" || action === "suspend") {
    // Désactiver les configs liées (on garde les données mais on ne sync plus)
    // Pour l'instant on supprime simplement l'installation (cascade sur les configs)
    await db
      .delete(schema.githubAppInstallations)
      .where(eq(schema.githubAppInstallations.installationId, githubInstallationId));
    return;
  }
}

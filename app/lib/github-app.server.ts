/**
 * GitHub App client
 *
 * Gère l'authentification GitHub App via @octokit/app (JWT RS256, tokens d'installation)
 * ainsi que les appels à l'API GitHub REST pour lire et écrire des fichiers.
 *
 * Variables d'environnement requises :
 *   GITHUB_APP_ID          – ID numérique de la GitHub App
 *   GITHUB_APP_PRIVATE_KEY – Clé privée RSA PEM PKCS#1 ou PKCS#8 (peut contenir des \n littéraux)
 */

import { App } from "@octokit/app";
import { Octokit } from "@octokit/rest";
import { createHmac, timingSafeEqual } from "crypto";

// ─── App singleton ────────────────────────────────────────────────────────────

let _app: App | null = null;

function getApp(): App {
  if (_app) return _app;

  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;

  if (!appId) {
    throw new Error("GITHUB_APP_ID manquante dans les variables d'environnement");
  }
  if (!privateKey) {
    throw new Error(
      "GITHUB_APP_PRIVATE_KEY manquante dans les variables d'environnement",
    );
  }

  // Support des \n littéraux dans la variable d'env (Docker / CI commun)
  _app = new App({
    appId,
    privateKey: privateKey.replace(/\\n/g, "\n"),
    Octokit,
  });

  return _app;
}

async function getInstallationOctokit(installationId: string): Promise<Octokit> {
  return getApp().getInstallationOctokit(parseInt(installationId, 10)) as Promise<Octokit>;
}

function splitRepoFullName(repoFullName: string): { owner: string; repo: string } {
  const [owner, repo] = repoFullName.split("/");
  if (!owner || !repo) {
    throw new Error(`Invalid repoFullName: "${repoFullName}"`);
  }
  return { owner, repo };
}

// ─── File operations ──────────────────────────────────────────────────────────

/**
 * Récupère le contenu d'un fichier depuis un repo GitHub.
 * Retourne null si le fichier n'existe pas (404).
 */
export async function getFileContent(
  installationId: string,
  repoFullName: string,
  filePath: string,
  ref: string,
): Promise<{ content: string; sha: string } | null> {
  const octokit = await getInstallationOctokit(installationId);
  const { owner, repo } = splitRepoFullName(repoFullName);

  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: filePath,
      ref,
    });

    if (Array.isArray(data) || data.type !== "file") {
      throw new Error(`"${filePath}" is not a file`);
    }

    const rawContent = Buffer.from(
      data.content.replace(/\n/g, ""),
      "base64",
    ).toString("utf-8");

    return { content: rawContent, sha: data.sha };
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "status" in err &&
      (err as { status: number }).status === 404
    ) {
      return null;
    }
    throw err;
  }
}

/**
 * Crée ou met à jour un fichier dans un repo GitHub via l'API Contents.
 * `currentSha` est requis pour la mise à jour (absent = création).
 */
export async function commitFile(
  installationId: string,
  repoFullName: string,
  filePath: string,
  content: string,
  commitMessage: string,
  branch: string,
  currentSha?: string,
): Promise<void> {
  const octokit = await getInstallationOctokit(installationId);
  const { owner, repo } = splitRepoFullName(repoFullName);

  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: filePath,
    message: commitMessage,
    content: Buffer.from(content, "utf-8").toString("base64"),
    branch,
    ...(currentSha ? { sha: currentSha } : {}),
  });
}

// ─── PR Comments ──────────────────────────────────────────────────────────────

/**
 * Crée ou met à jour un commentaire sur une PR GitHub.
 * Si `existingCommentId` est fourni, met à jour le commentaire existant.
 * Retourne l'ID du commentaire créé/mis à jour pour pouvoir le réutiliser.
 */
export async function upsertPRComment(
  installationId: string,
  repoFullName: string,
  prNumber: number,
  body: string,
  existingCommentId?: number,
): Promise<number> {
  const octokit = await getInstallationOctokit(installationId);
  const { owner, repo } = splitRepoFullName(repoFullName);

  if (existingCommentId) {
    const { data } = await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existingCommentId,
      body,
    });
    return data.id;
  }

  const { data } = await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body,
  });
  return data.id;
}

// ─── Repository listing ───────────────────────────────────────────────────────

type GitHubRepo = {
  id: number;
  full_name: string;
  name: string;
  private: boolean;
  default_branch: string;
};

/**
 * Liste les repos accessibles par une installation GitHub App.
 */
export async function listInstallationRepos(
  installationId: string,
): Promise<Array<GitHubRepo>> {
  const octokit = await getInstallationOctokit(installationId);

  const { data } = await octokit.rest.apps.listReposAccessibleToInstallation({
    per_page: 100,
  });

  return data.repositories.map((r) => ({
    id: r.id,
    full_name: r.full_name,
    name: r.name,
    private: r.private,
    default_branch: r.default_branch,
  }));
}

// ─── Webhook signature verification ──────────────────────────────────────────

/**
 * Vérifie la signature HMAC-SHA256 d'un webhook GitHub.
 * Retourne true si la signature est valide.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error(
      "GITHUB_WEBHOOK_SECRET manquante dans les variables d'environnement",
    );
  }
  if (!signatureHeader) {
    return false;
  }

  const [algorithm, hash] = signatureHeader.split("=");
  if (algorithm !== "sha256" || !hash) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(hash, "hex"),
      Buffer.from(expected, "hex"),
    );
  } catch {
    return false;
  }
}

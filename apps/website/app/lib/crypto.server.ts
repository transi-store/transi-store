import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Recommandé pour GCM
const AUTH_TAG_LENGTH = 16;

/**
 * Récupère la clé de chiffrement depuis les variables d'environnement.
 * La clé doit être une chaîne hexadécimale de 64 caractères (32 bytes).
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "ENCRYPTION_KEY manquante. Générez-en une avec: openssl rand -hex 32",
    );
  }
  if (key.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY doit être une chaîne hexadécimale de 64 caractères (32 bytes)",
    );
  }
  return Buffer.from(key, "hex");
}

/**
 * Chiffre une chaîne de texte avec AES-256-GCM.
 * Retourne une chaîne au format: iv:authTag:ciphertext (tous en base64)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:ciphertext
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;
}

/**
 * Déchiffre une chaîne chiffrée avec AES-256-GCM.
 * Attend une chaîne au format: iv:authTag:ciphertext (tous en base64)
 */
export function decrypt(encryptedData: string): string {
  const key = getEncryptionKey();

  const parts = encryptedData.split(":");
  if (parts.length !== 3) {
    throw new Error("Format de données chiffrées invalide");
  }

  const [ivBase64, authTagBase64, ciphertext] = parts;
  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

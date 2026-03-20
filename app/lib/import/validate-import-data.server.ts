/**
 * Validate import data structure (format-agnostic).
 */
export function validateImportData(
  data: Record<string, string>,
): Array<string> {
  const errors: Array<string> = [];

  const entries = Object.entries(data);

  if (entries.length === 0) {
    return ["Le fichier ne contient aucune traduction"];
  }

  for (const [key, value] of entries) {
    // Check key is non-empty
    if (!key || key.trim() === "") {
      errors.push("Une clé vide a été trouvée dans le fichier");
      continue;
    }

    // Check key length (database limit is 500)
    if (key.length > 500) {
      errors.push(
        `La clé "${key.substring(0, 50)}..." est trop longue (maximum 500 caractères)`,
      );
    }

    // Check value is a string
    if (typeof value !== "string") {
      errors.push(
        `La valeur pour la clé "${key}" doit être une chaîne de caractères`,
      );
    }
  }

  return errors;
}

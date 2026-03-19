import { describe, it, expect } from "vitest";
import { parseImportJSON, validateImportData } from "./json.server";

describe("parseImportJSON", () => {
  it("should parse a valid JSON file", () => {
    const data = {
      "home.title": "Accueil",
      "home.subtitle": "Bienvenue",
    };

    const json = JSON.stringify(data);

    const result = parseImportJSON(json);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(data);
  });

  it("should return error for invalid JSON", () => {
    const result = parseImportJSON("not valid json {");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Format JSON invalide");
  });

  it("should return error for array JSON", () => {
    const result = parseImportJSON('["a", "b"]');

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "Le fichier doit contenir un objet JSON avec des paires clé/valeur",
    );
  });

  it("should return error for null JSON", () => {
    const result = parseImportJSON("null");

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "Le fichier doit contenir un objet JSON avec des paires clé/valeur",
    );
  });

  it("should return error when file is too large", () => {
    const largeContent = JSON.stringify({ key: "x".repeat(6 * 1024 * 1024) });

    const result = parseImportJSON(largeContent);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Le fichier est trop volumineux (maximum 5 MB)");
  });

  it("should handle empty object", () => {
    const result = parseImportJSON("{}");

    expect(result.success).toBe(true);
    expect(result.data).toEqual({});
  });

  it("should handle special characters in values", () => {
    const data = {
      greeting: 'Hello "world" & <friends>',
    };

    const result = parseImportJSON(JSON.stringify(data));

    expect(result.success).toBe(true);
    expect(result.data).toEqual(data);
  });

  it("should handle unicode and emojis", () => {
    const data = {
      emoji: "Émojis: 🎉🚀",
      accents: "àéîôü",
    };

    const result = parseImportJSON(JSON.stringify(data));

    expect(result.success).toBe(true);
    expect(result.data).toEqual(data);
  });
});

describe("validateImportData", () => {
  it("should return no errors for valid data", () => {
    const errors = validateImportData({
      "home.title": "Accueil",
      "nav.about": "À propos",
    });

    expect(errors).toEqual([]);
  });

  it("should return error for empty data", () => {
    const errors = validateImportData({});

    expect(errors).toHaveLength(1);
    expect(errors[0]).toBe("Le fichier ne contient aucune traduction");
  });

  it("should return error for empty key", () => {
    const errors = validateImportData({ "": "value" });

    expect(errors).toEqual(["Une clé vide a été trouvée dans le fichier"]);
  });

  it("should return error for whitespace-only key", () => {
    const errors = validateImportData({ "   ": "value" });

    expect(errors).toEqual(["Une clé vide a été trouvée dans le fichier"]);
  });

  it("should return error for key exceeding 500 characters", () => {
    const longKey = "k".repeat(501);
    const errors = validateImportData({ [longKey]: "value" });

    expect(errors).toEqual([
      `La clé "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk..." est trop longue (maximum 500 caractères)`,
    ]);
  });

  it("should accept key with exactly 500 characters", () => {
    const key500 = "k".repeat(500);
    const errors = validateImportData({ [key500]: "value" });

    expect(errors).toEqual([]);
  });

  it("should return error for non-string value", () => {
    const data = { key: 42 } as unknown as Record<string, string>;
    const errors = validateImportData(data);

    expect(errors).toEqual([
      'La valeur pour la clé "key" doit être une chaîne de caractères',
    ]);
  });

  it("should accumulate multiple errors", () => {
    const data: Record<string, unknown> = {
      "": "empty key",
      valid: 123,
    };
    data["k".repeat(501)] = "too long key";

    const errors = validateImportData(data as Record<string, string>);

    expect(errors.length).toBe(3);
  });
});

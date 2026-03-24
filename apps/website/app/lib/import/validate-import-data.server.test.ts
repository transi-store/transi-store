import { describe, it, expect } from "vitest";
import { validateImportData } from "./validate-import-data.server";

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

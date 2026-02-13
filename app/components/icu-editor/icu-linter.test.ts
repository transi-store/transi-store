import { describe, it, expect } from "vitest";
import {
  parseIcu,
  extractVariables,
  extractVariablesFromAst,
} from "./icu-linter";

describe("parseIcu", () => {
  it("should return null for empty text", () => {
    expect(parseIcu("")).toBeNull();
    expect(parseIcu("   ")).toBeNull();
  });

  it("should return AST for simple variable", () => {
    const ast = parseIcu("Hello, {name}!");
    expect(ast).not.toBeNull();
    expect(Array.isArray(ast)).toBe(true);
  });

  it("should return AST for plural pattern", () => {
    const ast = parseIcu("{count, plural, one {# item} other {# items}}");
    expect(ast).not.toBeNull();
    expect(Array.isArray(ast)).toBe(true);
  });

  it("should return null for invalid syntax", () => {
    const ast = parseIcu("{invalid");
    expect(ast).toBeNull();
  });
});

describe("extractVariablesFromAst", () => {
  it("should extract variables from AST", () => {
    const ast = parseIcu("Hello {name}, you have {count} items");
    expect(ast).not.toBeNull();
    if (ast) {
      const variables = extractVariablesFromAst(ast);
      expect(variables).toEqual(["count", "name"]);
    }
  });

  it("should handle plural patterns", () => {
    const ast = parseIcu("{count, plural, one {# item} other {# items}}");
    expect(ast).not.toBeNull();
    if (ast) {
      const variables = extractVariablesFromAst(ast);
      expect(variables).toEqual(["count"]);
    }
  });

  it("should handle nested variables", () => {
    const ast = parseIcu(
      "{count, plural, one {{owner} has # item} other {{owner} has # items}}",
    );
    expect(ast).not.toBeNull();
    if (ast) {
      const variables = extractVariablesFromAst(ast);
      expect(variables).toEqual(["count", "owner"]);
    }
  });
});

describe("extractVariables", () => {
  it("should extract variables from simple message", () => {
    expect(extractVariables("Hello {name}!")).toEqual(["name"]);
  });

  it("should extract variables from plural", () => {
    expect(
      extractVariables("{count, plural, one {# item} other {# items}}"),
    ).toEqual(["count"]);
  });

  it("should extract variables from select", () => {
    expect(
      extractVariables("{gender, select, male {He} female {She} other {They}}"),
    ).toEqual(["gender"]);
  });

  it("should extract multiple variables", () => {
    expect(extractVariables("Hello {name}, you have {count} items")).toEqual([
      "count",
      "name",
    ]);
  });

  it("should handle nested variables", () => {
    const variables = extractVariables(
      "{count, plural, one {{owner} has # item} other {{owner} has # items}}",
    );
    expect(variables).toEqual(["count", "owner"]);
  });

  it("should return empty array for invalid syntax", () => {
    expect(extractVariables("{invalid")).toEqual([]);
  });

  it("should return empty array for empty text", () => {
    expect(extractVariables("")).toEqual([]);
    expect(extractVariables("   ")).toEqual([]);
  });
});

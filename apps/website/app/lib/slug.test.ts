import { describe, it, expect } from "vitest";
import { generateSlug } from "./slug";

describe("generateSlug", () => {
  it("converts to lowercase", () => {
    expect(generateSlug("MyProject")).toBe("myproject");
  });

  it("replaces spaces with dashes", () => {
    expect(generateSlug("my project")).toBe("my-project");
  });

  it("collapses multiple spaces into a single dash", () => {
    expect(generateSlug("my  project")).toBe("my-project");
  });

  it("removes leading and trailing dashes", () => {
    expect(generateSlug("  my project  ")).toBe("my-project");
  });

  it("removes accents", () => {
    expect(generateSlug("éàü")).toBe("eau");
  });

  it("preserves dots", () => {
    expect(generateSlug("foo.bar")).toBe("foo.bar");
  });

  it("preserves dots with multiple segments", () => {
    expect(generateSlug("foo.bar.baz")).toBe("foo.bar.baz");
  });

  it("handles mixed dots, dashes and words", () => {
    expect(generateSlug("my.great project")).toBe("my.great-project");
  });

  it("handles special characters around dots", () => {
    expect(generateSlug("foo!.bar")).toBe("foo.bar");
  });

  it("replaces special characters with dashes", () => {
    expect(generateSlug("hello@world")).toBe("hello-world");
  });

  it("handles empty string", () => {
    expect(generateSlug("")).toBe("");
  });

  it("handles string with only special characters", () => {
    expect(generateSlug("!!!")).toBe("");
  });

  it("handles accented characters followed by a dot", () => {
    expect(generateSlug("café.bar")).toBe("cafe.bar");
  });
});

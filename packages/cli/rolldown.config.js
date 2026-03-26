import { defineConfig } from "rolldown";

export default defineConfig({
  input: "src/cli.ts",
  external: [
    /^node:/,
    /^@commander-js\/extra-typings/,
    "commander",
    "simple-git",
    "zod",
  ],
  output: {
    file: "dist/cli.js",
  },
});

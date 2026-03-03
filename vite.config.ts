import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import path from "node:path";
import "dotenv/config";
import babel from "vite-plugin-babel";

const allowedHosts =
  process.env.DOMAIN_ROOT &&
  new URL(process.env.DOMAIN_ROOT ?? "localhost").hostname;

// See https://react.dev/learn/react-compiler/reference for available options
const ReactCompilerConfig = {};

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [
    reactRouter(),
    babel({
      filter: /\.[jt]sx?$/,
      babelConfig: {
        presets: ["@babel/preset-typescript"],
        plugins: [["babel-plugin-react-compiler", ReactCompilerConfig]],
      },
    }),
  ],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./app"),
    },
  },
  build: {
    rollupOptions: isSsrBuild ? { input: "./server/app.ts" } : undefined,
  },
  server: {
    host: "0.0.0.0", // Écoute sur toutes les interfaces pour permettre l'accès depuis l'hôte
    allowedHosts: allowedHosts ? [allowedHosts] : undefined, // Autorise les requêtes provenant de ce domaine
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true, // Nécessaire pour que le hot reload fonctionne avec Docker sur Windows
    },
  },
}));

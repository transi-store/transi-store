import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  plugins: [reactRouter()],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./app"),
    },
  },
  server: {
    host: "0.0.0.0", // Écoute sur toutes les interfaces pour permettre l'accès depuis l'hôte
    allowedHosts: ["jdeniau.dev.mapado.com"], // Autorise les requêtes provenant de ce domaine
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true, // Nécessaire pour que le hot reload fonctionne avec Docker sur Windows
    },
  },
});

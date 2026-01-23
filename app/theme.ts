import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

// Thème Mapado - Palette de couleurs officielle
const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        // Couleur principale - Blue Mapado (#00859c)
        brand: {
          50: { value: "#e6f5f7" },
          100: { value: "#b3e0e5" },
          200: { value: "#80cbd3" },
          300: { value: "#4db6c1" },
          400: { value: "#26a0af" },
          500: { value: "#00859c" }, // Primary Blue Mapado
          600: { value: "#006a7d" },
          700: { value: "#00505e" },
          800: { value: "#00353f" },
          900: { value: "#001b20" },
          950: { value: "#000d10" },
        },
        // Couleur accent - Orange Mapado (#ff4024)
        accent: {
          50: { value: "#ffebe8" },
          100: { value: "#ffc7be" },
          200: { value: "#ffa394" },
          300: { value: "#ff7f6a" },
          400: { value: "#ff5f47" },
          500: { value: "#ff4024" }, // Primary Orange Mapado
          600: { value: "#e6391f" },
          700: { value: "#b32c18" },
          800: { value: "#801f11" },
          900: { value: "#4d120a" },
          950: { value: "#330c07" },
        },
        // Green Mapado (#30bf97)
        green: {
          50: { value: "#e8f9f4" },
          100: { value: "#bfeee0" },
          200: { value: "#96e3cc" },
          300: { value: "#6dd8b8" },
          400: { value: "#51cda8" },
          500: { value: "#30bf97" }, // Primary Green Mapado
          600: { value: "#28a581" },
          700: { value: "#1f7e63" },
          800: { value: "#165745" },
          900: { value: "#0d3027" },
          950: { value: "#071814" },
        },
        // Yellow Mapado (#ec8d00)
        yellow: {
          50: { value: "#fef6e6" },
          100: { value: "#fce7b3" },
          200: { value: "#fad880" },
          300: { value: "#f8c94d" },
          400: { value: "#f5bb26" },
          500: { value: "#ec8d00" }, // Alert Yellow Mapado
          600: { value: "#c97400" },
          700: { value: "#975800" },
          800: { value: "#643b00" },
          900: { value: "#321d00" },
          950: { value: "#190e00" },
        },
        // Red Mapado (#cf1b01)
        red: {
          50: { value: "#fce8e5" },
          100: { value: "#f7bfb3" },
          200: { value: "#f29681" },
          300: { value: "#ed6d4f" },
          400: { value: "#e94f28" },
          500: { value: "#cf1b01" }, // Alert Red Mapado
          600: { value: "#a91601" },
          700: { value: "#7f1101" },
          800: { value: "#550b00" },
          900: { value: "#2b0600" },
          950: { value: "#150300" },
        },
        // Mapado additional colors
        mapado: {
          black: { value: "#001c3c" },
          blue: { value: "#00859c" },
          orange: { value: "#ff4024" },
          gray: { value: "#49658d" },
          lightGray: { value: "#d2d7dc" },
          white: { value: "#f7f5f7" },
          green: { value: "#30bf97" },
          yellow: { value: "#ec8d00" },
          red: { value: "#cf1b01" },
          purple: { value: "#a6427f" },
          gold: { value: "#c47618" },
          cyan: { value: "#00a7af" },
          iris: { value: "#6263b3" },
        },
      },
    },
    semanticTokens: {
      colors: {
        // Tokens sémantiques pour la couleur principale (Blue Mapado)
        brand: {
          solid: { value: "{colors.brand.500}" },
          contrast: { value: "white" },
          fg: {
            value: {
              _light: "{colors.brand.700}",
              _dark: "{colors.brand.300}",
            },
          },
          muted: { value: "{colors.brand.100}" },
          subtle: { value: "{colors.brand.50}" },
          emphasized: { value: "{colors.brand.600}" },
          focusRing: { value: "{colors.brand.500}" },
        },
        // Tokens sémantiques pour la couleur accent (Orange Mapado)
        accent: {
          solid: { value: "{colors.accent.500}" },
          contrast: { value: "white" },
          fg: {
            value: {
              _light: "{colors.accent.700}",
              _dark: "{colors.accent.300}",
            },
          },
          muted: { value: "{colors.accent.100}" },
          subtle: { value: "{colors.accent.50}" },
          emphasized: { value: "{colors.accent.600}" },
          focusRing: { value: "{colors.accent.500}" },
        },
        // Override des couleurs sémantiques par défaut avec les couleurs Mapado
        green: {
          solid: { value: "{colors.green.500}" },
          contrast: { value: "white" },
          fg: {
            value: {
              _light: "{colors.green.700}",
              _dark: "{colors.green.300}",
            },
          },
          muted: { value: "{colors.green.100}" },
          subtle: { value: "{colors.green.50}" },
          emphasized: { value: "{colors.green.600}" },
          focusRing: { value: "{colors.green.500}" },
        },
        yellow: {
          solid: { value: "{colors.yellow.500}" },
          contrast: { value: "white" },
          fg: {
            value: {
              _light: "{colors.yellow.700}",
              _dark: "{colors.yellow.300}",
            },
          },
          muted: { value: "{colors.yellow.100}" },
          subtle: { value: "{colors.yellow.50}" },
          emphasized: { value: "{colors.yellow.600}" },
          focusRing: { value: "{colors.yellow.500}" },
        },
        red: {
          solid: { value: "{colors.red.500}" },
          contrast: { value: "white" },
          fg: {
            value: {
              _light: "{colors.red.700}",
              _dark: "{colors.red.300}",
            },
          },
          muted: { value: "{colors.red.100}" },
          subtle: { value: "{colors.red.50}" },
          emphasized: { value: "{colors.red.600}" },
          focusRing: { value: "{colors.red.500}" },
        },
      },
    },
  },
});

// Créer le système de thème en fusionnant avec la config par défaut
export const system = createSystem(defaultConfig, config);

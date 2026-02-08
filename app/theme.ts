import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

// Configuration du thème Transi-Store
const config = defineConfig({
  cssVarsPrefix: "transi",

  globalCss: {
    body: {
      fontFamily:
        "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    },
  },

  theme: {
    tokens: {
      colors: {
        // Bleu principal (#3B82F6)
        brand: {
          50: { value: "#EBF5FF" },
          100: { value: "#D1E9FF" },
          200: { value: "#B3DDFF" },
          300: { value: "#84CAFF" },
          400: { value: "#4B8BF5" },
          500: { value: "#3B82F6" },
          600: { value: "#2563EB" },
          700: { value: "#1D4ED8" },
          800: { value: "#1E40AF" },
          900: { value: "#1E3A8A" },
          950: { value: "#172554" },
        },
        // Vert accent (#84CC16)
        accent: {
          50: { value: "#F7FEE7" },
          100: { value: "#ECFCCB" },
          200: { value: "#D9F99D" },
          300: { value: "#BEF264" },
          400: { value: "#A3E635" },
          500: { value: "#84CC16" },
          600: { value: "#65A30D" },
          700: { value: "#4D7C0F" },
          800: { value: "#3F6212" },
          900: { value: "#365314" },
          950: { value: "#121B28" },
        },
      },
    },
    semanticTokens: {
      colors: {
        // Couleurs de marque (bleu principal)
        brand: {
          solid: {
            value: {
              _light: "{colors.brand.500}",
              _dark: "{colors.brand.400}",
            },
          },
          contrast: { value: "white" },
          fg: {
            value: {
              _light: "{colors.brand.700}",
              _dark: "{colors.brand.300}",
            },
          },
          muted: {
            value: {
              _light: "{colors.brand.100}",
              _dark: "{colors.brand.900}",
            },
          },
          subtle: {
            value: { _light: "{colors.brand.50}", _dark: "{colors.brand.950}" },
          },
          emphasized: {
            value: {
              _light: "{colors.brand.600}",
              _dark: "{colors.brand.500}",
            },
          },
          focusRing: {
            value: {
              _light: "{colors.brand.500}",
              _dark: "{colors.brand.400}",
            },
          },
        },
        // Couleurs d'accent (vert)
        accent: {
          solid: {
            value: {
              _light: "{colors.accent.500}",
              _dark: "{colors.accent.400}",
            },
          },
          contrast: { value: "white" },
          fg: {
            value: {
              _light: "{colors.accent.700}",
              _dark: "{colors.accent.300}",
            },
          },
          muted: {
            value: {
              _light: "{colors.accent.100}",
              _dark: "{colors.accent.900}",
            },
          },
          subtle: {
            value: {
              _light: "{colors.accent.50}",
              _dark: "{colors.accent.950}",
            },
          },
          emphasized: {
            value: {
              _light: "{colors.accent.600}",
              _dark: "{colors.accent.500}",
            },
          },
          focusRing: {
            value: {
              _light: "{colors.accent.500}",
              _dark: "{colors.accent.400}",
            },
          },
        },
        header: {
          bg: {
            value: "{colors.accent.950}",
          },
          bgHover: {
            value: "{colors.gray.700}",
          },
          fg: {
            value: "white",
          },
        },
      },
    },
  },
});

// Créer le système avec la config par défaut et notre config personnalisée
export const system = createSystem(defaultConfig, config);

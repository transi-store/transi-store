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
    keyframes: {
      float: {
        "0%, 100%": { transform: "translateY(0)" },
        "50%": { transform: "translateY(-10px)" },
      },
    },
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
        // Accent industriel cuivre/ambre
        accent: {
          50: { value: "#FFF8ED" },
          100: { value: "#FEEBC8" },
          200: { value: "#FBD38D" },
          300: { value: "#F6AD55" },
          400: { value: "#ED8936" },
          500: { value: "#DD6B20" },
          600: { value: "#C05621" },
          700: { value: "#9C4221" },
          800: { value: "#7B341E" },
          900: { value: "#652B19" },
          950: { value: "#2A180F" },
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
            value: {
              _light: "rgba(255, 255, 255, 0.82)",
              _dark: "rgba(10, 15, 24, 0.82)",
            },
          },
          border: {
            value: {
              _light: "rgba(15, 23, 42, 0.08)",
              _dark: "rgba(148, 163, 184, 0.18)",
            },
          },
          fg: {
            value: {
              _light: "{colors.accent.950}",
              _dark: "#ffffff",
            },
          },
        },
        surface: {
          canvas: {
            value: {
              _light: "#f4f1ea",
              _dark: "#0a1018",
            },
          },
          panel: {
            value: {
              _light: "rgba(255, 255, 255, 0.88)",
              _dark: "rgba(15, 23, 36, 0.9)",
            },
          },
          panelMuted: {
            value: {
              _light: "rgba(244, 241, 234, 0.92)",
              _dark: "rgba(19, 28, 43, 0.92)",
            },
          },
          border: {
            value: {
              _light: "rgba(15, 23, 42, 0.08)",
              _dark: "rgba(148, 163, 184, 0.18)",
            },
          },
          highlight: {
            value: {
              _light: "rgba(59, 130, 246, 0.12)",
              _dark: "rgba(59, 130, 246, 0.18)",
            },
          },
        },
      },
    },
  },
});

// Créer le système avec la config par défaut et notre config personnalisée
export const system = createSystem(defaultConfig, config);

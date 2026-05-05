import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

/**
 * Transi-Store theme — industrial design language
 *
 * Palette extracted from the transistor logo:
 *   Blue  #1569D4  — translation bubble
 *   Green #87C241  — transistor body / arrows
 *   Teal  #43AECE  — connector accent
 *   Navy  #121B28  — transistor pins (dark)
 */
const monoFontFamily = ["'Monaspace Krypton'", "monospace"].join(", ");
const sansFontFamily = [
  "'Space Grotesk'",
  "-apple-system",
  "BlinkMacSystemFont",
  "'Segoe UI'",
  "Helvetica",
  "Arial",
  "sans-serif",
].join(", ");

const headingFontFamily =
  "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

const config = defineConfig({
  cssVarsPrefix: "transi",

  globalCss: {
    html: {
      bg: "surface.canvas",
      color: "fg",
      // Offset anchor-link scrolling so the sticky header never hides the target.
      // On mobile, the fixed bottom nav adds extra visual context so we use a
      // larger value to keep targets clearly visible.
      scrollPaddingTop: { base: "162px", md: "80px" },
    },
    body: {
      bg: "surface.canvas",
      color: "fg",
      fontFamily: sansFontFamily,
      fontWeight: "normal",
    },
    "h1, h2, h3, h4, h5, h6": {
      fontFamily: headingFontFamily,
    },
  },

  theme: {
    keyframes: {},
    tokens: {
      fonts: {
        body: { value: sansFontFamily },
        heading: { value: headingFontFamily },
        mono: { value: monoFontFamily },
      },
      colors: {
        brand: {
          50: { value: "#e8f0fd" },
          100: { value: "#c5d9fa" },
          200: { value: "#9fbef6" },
          300: { value: "#6da0f0" },
          400: { value: "#3b82f6" },
          500: { value: "#1569D4" },
          600: { value: "#1158b8" },
          700: { value: "#0d479c" },
          800: { value: "#0a3780" },
          900: { value: "#072a66" },
          950: { value: "#041a45" },
        },
        accent: {
          50: { value: "#f2fce4" },
          100: { value: "#e0f7c0" },
          200: { value: "#c5ef8a" },
          300: { value: "#a6e352" },
          400: { value: "#8CC749" },
          500: { value: "#87C241" },
          600: { value: "#6da134" },
          700: { value: "#558028" },
          800: { value: "#3e5f1d" },
          900: { value: "#2a4014" },
          950: { value: "#172409" },
        },
        teal: {
          50: { value: "#e6f7fb" },
          100: { value: "#c0ecf5" },
          200: { value: "#8fddec" },
          300: { value: "#5dcde2" },
          400: { value: "#43AECE" },
          500: { value: "#3698b5" },
          600: { value: "#2c7f99" },
          700: { value: "#22647a" },
          800: { value: "#194b5c" },
          900: { value: "#10333f" },
          950: { value: "#081d25" },
        },
        navy: {
          50: { value: "#e8ecf0" },
          100: { value: "#c4cdd8" },
          200: { value: "#96a4b8" },
          300: { value: "#687a97" },
          400: { value: "#3e5377" },
          500: { value: "#1e3456" },
          600: { value: "#182a47" },
          700: { value: "#121F36" },
          800: { value: "#121B28" },
          900: { value: "#0a1018" },
          950: { value: "#060a10" },
        },
      },
    },
    semanticTokens: {
      colors: {
        bg: {
          DEFAULT: {
            value: {
              _light: "#ffffff",
              _dark: "#0f1722",
            },
          },
          subtle: {
            value: {
              _light: "#fafbfc",
              _dark: "#121b28",
            },
          },
          muted: {
            value: {
              _light: "#f2f5f8",
              _dark: "#182436",
            },
          },
          emphasized: {
            value: {
              _light: "#e8ecf0",
              _dark: "#22324a",
            },
          },
          panel: {
            value: {
              _light: "rgba(255, 255, 255, 0.96)",
              _dark: "rgba(18, 27, 40, 0.96)",
            },
          },
          inverted: {
            value: {
              _light: "{colors.navy.800}",
              _dark: "#f8fafc",
            },
          },
        },
        fg: {
          DEFAULT: {
            value: {
              _light: "{colors.navy.800}",
              _dark: "#f8fafc",
            },
          },
          muted: {
            value: {
              _light: "{colors.navy.500}",
              _dark: "rgba(248, 250, 252, 0.72)",
            },
          },
          subtle: {
            value: {
              _light: "{colors.navy.400}",
              _dark: "rgba(248, 250, 252, 0.58)",
            },
          },
          inverted: {
            value: {
              _light: "#ffffff",
              _dark: "{colors.navy.800}",
            },
          },
        },
        border: {
          DEFAULT: {
            value: {
              _light: "rgba(18, 27, 40, 0.12)",
              _dark: "rgba(67, 174, 206, 0.18)",
            },
          },
          muted: {
            value: {
              _light: "rgba(18, 27, 40, 0.08)",
              _dark: "rgba(67, 174, 206, 0.12)",
            },
          },
          subtle: {
            value: {
              _light: "rgba(18, 27, 40, 0.06)",
              _dark: "rgba(67, 174, 206, 0.1)",
            },
          },
          emphasized: {
            value: {
              _light: "rgba(18, 27, 40, 0.18)",
              _dark: "rgba(67, 174, 206, 0.28)",
            },
          },
          inverted: {
            value: {
              _light: "rgba(255, 255, 255, 0.24)",
              _dark: "rgba(18, 27, 40, 0.24)",
            },
          },
        },
        gray: {
          contrast: { value: "#ffffff" },
          fg: {
            value: {
              _light: "{colors.navy.700}",
              _dark: "{colors.navy.200}",
            },
          },
          muted: {
            value: {
              _light: "#edf1f5",
              _dark: "{colors.navy.700}",
            },
          },
          subtle: {
            value: {
              _light: "#f7f9fb",
              _dark: "{colors.navy.800}",
            },
          },
          emphasized: {
            value: {
              _light: "#e4eaf0",
              _dark: "{colors.navy.600}",
            },
          },
          solid: {
            value: {
              _light: "{colors.navy.700}",
              _dark: "{colors.navy.300}",
            },
          },
          focusRing: {
            value: {
              _light: "{colors.brand.500}",
              _dark: "{colors.brand.400}",
            },
          },
          border: {
            value: {
              _light: "rgba(18, 27, 40, 0.12)",
              _dark: "rgba(67, 174, 206, 0.18)",
            },
          },
        },
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
            value: {
              _light: "{colors.brand.50}",
              _dark: "{colors.brand.950}",
            },
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
              _light: "rgba(255, 255, 255, 0.85)",
              _dark: "rgba(10, 16, 24, 0.88)",
            },
          },
          border: {
            value: {
              _light: "rgba(18, 27, 40, 0.10)",
              _dark: "rgba(67, 174, 206, 0.25)",
            },
          },
          fg: {
            value: {
              _light: "{colors.navy.800}",
              _dark: "#ffffff",
            },
          },
        },
        neon: {
          fg: {
            value: {
              _light: "{colors.teal.500}",
              _dark: "{colors.teal.400}",
            },
          },
        },
        surface: {
          canvas: {
            value: {
              _light: "#fafbfc",
              _dark: "#0a1018",
            },
          },
          panel: {
            value: {
              _light: "rgba(255, 255, 255, 0.96)",
              _dark: "rgba(18, 27, 40, 0.92)",
            },
          },
          panelMuted: {
            value: {
              _light: "rgba(247, 249, 251, 0.98)",
              _dark: "rgba(14, 21, 32, 0.95)",
            },
          },
          border: {
            value: {
              _light: "rgba(18, 27, 40, 0.10)",
              _dark: "rgba(67, 174, 206, 0.15)",
            },
          },
          highlight: {
            value: {
              _light: "rgba(21, 105, 212, 0.10)",
              _dark: "rgba(59, 130, 246, 0.18)",
            },
          },
        },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);

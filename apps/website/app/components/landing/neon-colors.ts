/**
 * Neon accent colors from the transistor logo palette.
 * Used across marketing / landing sections for consistent bright accents
 * on both light and dark themes.
 */
export const NEON_BLUE = "#3B82F6";
export const NEON_GREEN = "#87C241";
export const NEON_TEAL = "#43AECE";

/** Cycling accent colors for indexed elements (cards, steps, etc.) */
export const NEON_CYCLE = [NEON_BLUE, NEON_GREEN, NEON_TEAL] as const;

/** Neon glow box-shadows — applied on both themes. */
export const NEON_GLOW = {
  blue: `0 0 6px rgba(59,130,246,0.5), 0 0 20px rgba(59,130,246,0.15)`,
  green: `0 0 6px rgba(135,194,65,0.5), 0 0 20px rgba(135,194,65,0.15)`,
  teal: `0 0 6px rgba(67,174,206,0.5), 0 0 20px rgba(67,174,206,0.15)`,
} as const;

const GLOW_CYCLE = [NEON_GLOW.blue, NEON_GLOW.green, NEON_GLOW.teal] as const;

/** Get the box-shadow glow for a cycling index */
export function neonGlowAt(index: number) {
  return GLOW_CYCLE[index % GLOW_CYCLE.length];
}

/** Subtle text-shadow for neon headings */
export const NEON_TEXT_GLOW = {
  teal: `0 0 12px rgba(67,174,206,0.4)`,
  blue: `0 0 12px rgba(59,130,246,0.4)`,
} as const;

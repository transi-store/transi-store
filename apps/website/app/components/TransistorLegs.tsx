import { Box } from "@chakra-ui/react";
import { NEON_BLUE, NEON_GREEN, NEON_TEAL } from "./landing/neon-colors";

/**
 * Decorative SVG reminiscent of the three transistor "legs" (pattes)
 * from the Transi-Store logo. Renders three short vertical traces with
 * pin-dot caps — used as a subtle brand accent in the header and sidebar.
 */
export function TransistorLegs({
  height = 20,
  opacity = 0.45,
}: {
  height?: number;
  opacity?: number;
}) {
  const legSpacing = 8;
  const width = legSpacing * 2 + 2;

  return (
    <Box
      as="span"
      display="inline-flex"
      alignItems="center"
      aria-hidden="true"
      opacity={opacity}
      filter="drop-shadow(0 0 2px rgba(67,174,206,0.4))"
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Left leg — blue */}
        <line
          x1="1"
          y1="0"
          x2="1"
          y2={height}
          stroke={NEON_BLUE}
          strokeWidth="1"
        />
        <circle cx="1" cy={height} r="1.5" fill={NEON_BLUE} />

        {/* Center leg — green */}
        <line
          x1={1 + legSpacing}
          y1="2"
          x2={1 + legSpacing}
          y2={height - 2}
          stroke={NEON_GREEN}
          strokeWidth="1"
        />
        <circle cx={1 + legSpacing} cy={height - 2} r="1.5" fill={NEON_GREEN} />

        {/* Right leg — teal */}
        <line
          x1={1 + legSpacing * 2}
          y1="0"
          x2={1 + legSpacing * 2}
          y2={height}
          stroke={NEON_TEAL}
          strokeWidth="1"
        />
        <circle cx={1 + legSpacing * 2} cy={height} r="1.5" fill={NEON_TEAL} />
      </svg>
    </Box>
  );
}

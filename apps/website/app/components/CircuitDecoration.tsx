import { Box } from "@chakra-ui/react";

/**
 * Dense circuit-board SVG with an animated dot traveling along the traces.
 * Purely decorative — no semantic content.
 */
export function CircuitDecoration() {
  // The path the animated dot follows: a continuous route through the circuit
  const travelPath =
    "M 0,80 L 300,80 L 300,200 L 520,200 L 520,400 L 700,400 L 700,520 L 800,520";

  return (
    <Box
      position="absolute"
      inset={0}
      pointerEvents="none"
      overflow="hidden"
      opacity={0.4}
      filter="drop-shadow(0 0 3px rgba(67,174,206,0.4))"
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 800 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Respect prefers-reduced-motion */}
        <style>{`@media (prefers-reduced-motion: reduce) { animateMotion { display: none; } }`}</style>
        {/* ── Horizontal traces ── */}
        <line
          x1="0"
          y1="80"
          x2="300"
          y2="80"
          stroke="#43AECE"
          strokeWidth="1"
        />
        <line
          x1="350"
          y1="80"
          x2="800"
          y2="80"
          stroke="#43AECE"
          strokeWidth="1"
        />
        <line
          x1="0"
          y1="200"
          x2="180"
          y2="200"
          stroke="#1569D4"
          strokeWidth="1"
        />
        <line
          x1="230"
          y1="200"
          x2="520"
          y2="200"
          stroke="#1569D4"
          strokeWidth="1"
        />
        <line
          x1="570"
          y1="200"
          x2="800"
          y2="200"
          stroke="#1569D4"
          strokeWidth="1"
        />
        <line
          x1="60"
          y1="340"
          x2="400"
          y2="340"
          stroke="#87C241"
          strokeWidth="1"
        />
        <line
          x1="440"
          y1="340"
          x2="750"
          y2="340"
          stroke="#87C241"
          strokeWidth="1"
        />
        <line
          x1="0"
          y1="400"
          x2="520"
          y2="400"
          stroke="#43AECE"
          strokeWidth="1"
        />
        <line
          x1="560"
          y1="400"
          x2="800"
          y2="400"
          stroke="#43AECE"
          strokeWidth="1"
        />
        <line
          x1="80"
          y1="520"
          x2="700"
          y2="520"
          stroke="#87C241"
          strokeWidth="1"
        />

        {/* ── Vertical traces ── */}
        <line
          x1="300"
          y1="0"
          x2="300"
          y2="80"
          stroke="#43AECE"
          strokeWidth="1"
        />
        <line
          x1="300"
          y1="80"
          x2="300"
          y2="200"
          stroke="#43AECE"
          strokeWidth="1"
          strokeDasharray="4 8"
        />
        <line
          x1="520"
          y1="200"
          x2="520"
          y2="400"
          stroke="#1569D4"
          strokeWidth="1"
        />
        <line
          x1="180"
          y1="200"
          x2="180"
          y2="340"
          stroke="#1569D4"
          strokeWidth="1"
          strokeDasharray="4 8"
        />
        <line
          x1="700"
          y1="340"
          x2="700"
          y2="520"
          stroke="#87C241"
          strokeWidth="1"
        />
        <line
          x1="400"
          y1="340"
          x2="400"
          y2="600"
          stroke="#87C241"
          strokeWidth="1"
          strokeDasharray="4 8"
        />
        <line
          x1="60"
          y1="340"
          x2="60"
          y2="600"
          stroke="#1569D4"
          strokeWidth="1"
        />
        <line
          x1="750"
          y1="80"
          x2="750"
          y2="340"
          stroke="#43AECE"
          strokeWidth="1"
          strokeDasharray="4 8"
        />

        {/* ── Pin nodes at intersections ── */}
        <circle cx="300" cy="80" r="4" fill="#43AECE" />
        <circle cx="180" cy="200" r="4" fill="#1569D4" />
        <circle cx="520" cy="200" r="4" fill="#1569D4" />
        <circle cx="180" cy="340" r="3" fill="#1569D4" />
        <circle cx="400" cy="340" r="4" fill="#87C241" />
        <circle cx="700" cy="340" r="4" fill="#87C241" />
        <circle cx="750" cy="340" r="3" fill="#43AECE" />
        <circle cx="520" cy="400" r="4" fill="#43AECE" />
        <circle cx="700" cy="520" r="4" fill="#87C241" />
        <circle cx="60" cy="340" r="3" fill="#1569D4" />
        <circle cx="750" cy="80" r="3" fill="#43AECE" />

        {/* ── Connector pads ── */}
        <rect
          x="340"
          y="72"
          width="16"
          height="16"
          rx="2"
          fill="none"
          stroke="#43AECE"
          strokeWidth="1"
        />
        <rect
          x="222"
          y="192"
          width="16"
          height="16"
          rx="2"
          fill="none"
          stroke="#1569D4"
          strokeWidth="1"
        />
        <rect
          x="562"
          y="192"
          width="16"
          height="16"
          rx="2"
          fill="none"
          stroke="#1569D4"
          strokeWidth="1"
        />
        <rect
          x="432"
          y="332"
          width="16"
          height="16"
          rx="2"
          fill="none"
          stroke="#87C241"
          strokeWidth="1"
        />
        <rect
          x="552"
          y="392"
          width="16"
          height="16"
          rx="2"
          fill="none"
          stroke="#43AECE"
          strokeWidth="1"
        />

        {/* ── Animated traveling dot ── */}
        <path id="travel-path" d={travelPath} stroke="none" fill="none" />
        <circle r="5" fill="#43AECE">
          <animateMotion dur="12s" repeatCount="indefinite" path={travelPath} />
        </circle>
        {/* Glow effect around the traveling dot */}
        <circle r="10" fill="#43AECE" opacity="0.3">
          <animateMotion dur="12s" repeatCount="indefinite" path={travelPath} />
        </circle>
      </svg>
    </Box>
  );
}

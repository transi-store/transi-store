// Highlight utility for search matches
import { Box } from "@chakra-ui/react";

// Escapes regex special chars in the user's query
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Highlights occurrences of words from `query` in `text` using the theme yellow background
// Returns a React node (mixture of strings and <Box as="span"> matches )
export function TextHighlight({
  text,
  query,
}: {
  text: string | null | undefined;
  query: string | undefined;
}) {
  if (!text) return text;
  const q = query?.trim();
  if (!q || q.length < 2) return text;

  const words = q.split(/\s+/).filter(Boolean).map(escapeRegExp);
  if (words.length === 0) return text;

  const parts = text.split(new RegExp(`(${words.join("|")})`, "gi"));

  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <Box as="span" key={i} bg="yellow.100" px={1} borderRadius="sm">
        {part}
      </Box>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

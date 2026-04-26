/**
 * Client-only wrapper for MarkdownEditor.
 * CodeMirror is browser-only; on SSR we render a lightweight textarea fallback
 * so the layout is preserved and the form is still submittable.
 */
import { Suspense, lazy, type JSX } from "react";
import { Box, Textarea, Spinner } from "@chakra-ui/react";
import type { MarkdownEditorProps } from "./MarkdownEditor";

const MarkdownEditorLazy = lazy(() =>
  import("./MarkdownEditor").then((mod) => ({ default: mod.MarkdownEditor })),
);

function EditorFallback({
  value,
  disabled,
}: Pick<MarkdownEditorProps, "value" | "disabled">): JSX.Element {
  return (
    <Box
      position="relative"
      flex="1"
      minH={0}
      borderWidth={1}
      borderColor="border"
      borderRadius="md"
      bg="bg"
      overflow="hidden"
    >
      <Textarea
        value={value}
        disabled={disabled}
        readOnly
        h="full"
        border="none"
        fontFamily="mono"
        fontSize="sm"
        resize="none"
      />
      <Box
        position="absolute"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
      >
        <Spinner size="sm" color="brand.solid" />
      </Box>
    </Box>
  );
}

export function MarkdownEditorClient(props: MarkdownEditorProps): JSX.Element {
  if (typeof window === "undefined") {
    return <EditorFallback value={props.value} disabled={props.disabled} />;
  }

  return (
    <Suspense
      fallback={
        <EditorFallback value={props.value} disabled={props.disabled} />
      }
    >
      <MarkdownEditorLazy {...props} />
    </Suspense>
  );
}

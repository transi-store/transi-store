/**
 * Client-only wrapper for IcuEditor
 * Ensures CodeMirror only loads on the client side
 */

import { Suspense, lazy, type JSX } from "react";
import { Box, Textarea, Spinner } from "@chakra-ui/react";
import type { IcuEditorProps } from "./IcuEditor";

// Lazy load the editor only on client
const IcuEditorLazy = lazy(() =>
  import("./IcuEditor").then((mod) => ({ default: mod.IcuEditor })),
);

// Fallback during loading
function EditorFallback({
  value,
  placeholder,
  disabled,
  name,
}: Pick<
  IcuEditorProps,
  "value" | "placeholder" | "disabled" | "name"
>): JSX.Element {
  return (
    <Box position="relative">
      <Textarea
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        name={name}
        rows={3}
        readOnly
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

export function IcuEditorClient(props: IcuEditorProps): JSX.Element {
  // Check if we're on the client
  if (typeof window === "undefined") {
    return (
      <EditorFallback
        value={props.value}
        placeholder={props.placeholder}
        disabled={props.disabled}
        name={props.name}
      />
    );
  }

  return (
    <Suspense
      fallback={
        <EditorFallback
          value={props.value}
          placeholder={props.placeholder}
          disabled={props.disabled}
          name={props.name}
        />
      }
    >
      <IcuEditorLazy {...props} />
    </Suspense>
  );
}

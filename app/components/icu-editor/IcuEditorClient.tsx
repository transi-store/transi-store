/**
 * Client-only wrapper for IcuEditor
 * Ensures CodeMirror only loads on the client side
 */

import { Suspense, lazy } from "react";
import { Box, Textarea, Spinner } from "@chakra-ui/react";

// Lazy load the editor only on client
const IcuEditorLazy = lazy(() => 
  import("./IcuEditor").then((mod) => ({ default: mod.IcuEditor }))
);

interface IcuEditorClientProps {
  /** Initial value */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the editor is disabled */
  disabled?: boolean;
  /** Locale for preview */
  locale?: string;
  /** Show preview panel */
  showPreview?: boolean;
  /** Minimum height */
  minHeight?: string;
  /** Name attribute for form submission */
  name?: string;
}

// Fallback during loading
function EditorFallback({ 
  value, 
  placeholder, 
  disabled, 
  name 
}: Pick<IcuEditorClientProps, "value" | "placeholder" | "disabled" | "name">) {
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
        <Spinner size="sm" color="brand.500" />
      </Box>
    </Box>
  );
}

export function IcuEditorClient(props: IcuEditorClientProps) {
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

export default IcuEditorClient;

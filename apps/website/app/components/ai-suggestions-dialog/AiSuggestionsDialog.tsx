/**
 * Shared visuals for AI translation suggestions.
 *
 * - `AiSuggestionsCard` renders the full visual content (title row + body +
 *   footer with close button). It's reused both inside the real dialog and
 *   inside the docs mockup so they look identical.
 * - `AiSuggestionsDialog` wraps the card in a Chakra Dialog (portal, backdrop,
 *   focus management) and is what feature code mounts.
 *
 * Both duck-type `data` so callers can hand off their fetcher payload directly:
 * any shape exposing `error`/`originalError` renders the error state, any
 * shape exposing `suggestions` renders the suggestions list, anything else
 * falls through to nothing (e.g. the markdown "document" success scope).
 */
import {
  DialogBackdrop,
  DialogCloseTrigger,
  DialogContent,
  DialogPositioner,
  DialogRoot,
  Portal,
} from "@chakra-ui/react";
import {
  AiSuggestionsDialogContent,
  type AiSuggestionsData,
} from "./AiSuggestionsDialogContent";

type Props = {
  open: boolean;
  targetLocale: string | null;
  onClose: () => void;
  onSelect: (text: string) => void;
  isLoading: boolean;
  data: AiSuggestionsData;
  size?: "md" | "lg";
};

export default function AiSuggestionsDialog({
  open,
  targetLocale,
  onClose,
  onSelect,
  isLoading,
  data,
  size = "md",
}: Props) {
  return (
    <DialogRoot
      open={open}
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
      size={size}
    >
      <Portal>
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent>
            <AiSuggestionsDialogContent
              targetLocale={targetLocale}
              onSelect={onSelect}
              onClose={onClose}
              isLoading={isLoading}
              data={data}
            />
            <DialogCloseTrigger />
          </DialogContent>
        </DialogPositioner>
      </Portal>
    </DialogRoot>
  );
}

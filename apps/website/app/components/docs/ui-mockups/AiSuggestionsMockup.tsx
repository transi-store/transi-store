import { Box, DialogRoot } from "@chakra-ui/react";
import { AiSuggestionsDialogContent } from "~/components/ai-suggestions-dialog";
import { AiProviderEnum } from "~/lib/ai-providers";
import { MockupContainer } from "./MockupContainer";

const SUGGESTIONS = [
  {
    text: "Confirmer la commande",
    confidence: 0.95,
    notes:
      "Standard commercial term used by the majority of French online stores.",
  },
  {
    text: "Valider ma commande",
    confidence: 0.88,
    notes: "More personal and engaging phrasing, very common in e-commerce.",
  },
  {
    text: "Passer la commande",
    confidence: 0.74,
    notes:
      "Idiomatic expression that emphasises the action rather than the confirmation.",
  },
];

export function AiSuggestionsMockup() {
  return (
    <MockupContainer url="transi-store.com/orgs/acme/projects/webapp/keys/37">
      {/*
       * `DialogRoot` is rendered only for its slot-styles context — without
       * Backdrop/Positioner/Content the dialog has no visible chrome of its
       * own, which lets `AiSuggestionsCard` sit inline inside the mockup
       * frame while still picking up the real dialog theme tokens.
       */}
      <DialogRoot open lazyMount={false}>
        <Box pointerEvents="none">
          <AiSuggestionsDialogContent
            targetLocale="fr"
            data={{
              suggestions: SUGGESTIONS,
              provider: AiProviderEnum.GEMINI,
              providerModel: "gemini-2.0-flash",
            }}
          />
        </Box>
      </DialogRoot>
    </MockupContainer>
  );
}

import { IconButton } from "@chakra-ui/react";
import { LuCopy } from "react-icons/lu";
import { useCopyText } from "./useCopyText";
import type { JSX } from "react";

type CopyButtonProps = {
  text: string;
  ariaLabel?: string;
};

export default function CopyButton({
  text,
  ariaLabel,
}: CopyButtonProps): JSX.Element {
  const copyText = useCopyText();

  return (
    <IconButton
      aria-label={ariaLabel}
      variant="ghost"
      onClick={() => copyText(text)}
    >
      <LuCopy />
    </IconButton>
  );
}

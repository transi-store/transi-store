import { useState } from "react";
import { toaster } from "~/components/ui/toaster";
import { useTranslation } from "react-i18next";

type UseCopyInvitationLinkResult = {
  handleCopy: (code: string) => Promise<void>;
  showFallbackModal: boolean;
  fallbackLink: string;
  closeFallbackModal: () => void;
};

export function useCopyInvitationLink(
  origin: string,
): UseCopyInvitationLinkResult {
  const { t } = useTranslation();
  const [showFallbackModal, setShowFallbackModal] = useState(false);
  const [fallbackLink, setFallbackLink] = useState("");

  const handleCopy = async (code: string) => {
    const link = `${origin}/orgs/invite/${code}`;
    try {
      await navigator.clipboard.writeText(link);
      toaster.success({
        title: t("members.toasts.linkCopied.title"),
        description: t("members.toasts.linkCopied.description"),
      });
    } catch (_error) {
      setFallbackLink(link);
      setShowFallbackModal(true);
    }
  };

  const closeFallbackModal = () => {
    setShowFallbackModal(false);
  };

  return {
    handleCopy,
    showFallbackModal,
    fallbackLink,
    closeFallbackModal,
  };
}

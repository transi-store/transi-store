import { useTranslation } from "react-i18next";
import { toaster } from "~/components/ui/toaster";

type CopyOptions = {
  successTitle?: string;
  successDescription?: string;
  errorTitle?: string;
  errorDescription?: string;
};

type CopyFunction = (text: string, options?: CopyOptions) => Promise<void>;

export function useCopyText(): CopyFunction {
  const { t } = useTranslation();

  const handleCopy = async (text: string, options?: CopyOptions) => {
    try {
      await navigator.clipboard.writeText(text);
      toaster.success({
        title: options?.successTitle ?? t("copy.success.title"),
        description: options?.successDescription,
        duration: 3000,
      });
    } catch (_error) {
      toaster.error({
        title: options?.errorTitle ?? t("copy.error.title"),
        description: options?.errorDescription,
        duration: 3000,
      });
    }
  };

  return handleCopy;
}

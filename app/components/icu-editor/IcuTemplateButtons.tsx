import type { ReactNode } from "react";
import { Button, HStack, Text } from "@chakra-ui/react";
import { LuHash, LuListTree, LuGitBranch, LuBraces } from "react-icons/lu";
import { useTranslation } from "react-i18next";

/**
 * ICU Template Buttons Component
 * Provides quick-insert buttons for common ICU message format templates
 */
interface IcuTemplate {
  id: string;
  label: string;
  icon: ReactNode;
  template: string;
  description: string;
}

// ICU_TEMPLATES is built inside the component because translations are required

interface IcuTemplateButtonsProps {
  onInsertTemplate: (template: string) => void;
  disabled?: boolean;
}

export function IcuTemplateButtons({
  onInsertTemplate,
  disabled = false,
}: IcuTemplateButtonsProps) {
  const { t } = useTranslation();

  const ICU_TEMPLATES: IcuTemplate[] = [
    {
      id: "variable",
      label: t("icu.template.variable.label"),
      icon: <LuBraces />,
      template: "{variable}",
      description: t("icu.template.variable.description"),
    },
    {
      id: "plural",
      label: t("icu.template.plural.label"),
      icon: <LuHash />,
      template: `{count, plural,
  one {# item}
  other {# items}
}`,
      description: t("icu.template.plural.description"),
    },
    {
      id: "select",
      label: t("icu.template.select.label"),
      icon: <LuGitBranch />,
      template: `{gender, select,
  male {he}
  female {she}
  other {they}
}`,
      description: t("icu.template.select.description"),
    },
    {
      id: "selectordinal",
      label: t("icu.template.ordinal.label"),
      icon: <LuListTree />,
      template: `{position, selectordinal,
  one {#st}
  two {#nd}
  few {#rd}
  other {#th}
}`,
      description: t("icu.template.ordinal.description"),
    },
  ];
  return (
    <HStack gap={2} flexWrap="wrap">
      <Text fontSize="xs" color="gray.600" fontWeight="medium">
        {t("icu.templateButtons.label")}
      </Text>
      {ICU_TEMPLATES.map((template) => (
        <Button
          key={template.id}
          size="xs"
          variant="outline"
          onClick={() => onInsertTemplate(template.template)}
          disabled={disabled}
          title={template.description}
        >
          {template.icon}
          {template.label}
        </Button>
      ))}
    </HStack>
  );
}

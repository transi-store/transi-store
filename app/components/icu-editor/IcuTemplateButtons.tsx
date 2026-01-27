/**
 * ICU Template Buttons Component
 * Provides quick-insert buttons for common ICU message format templates
 */

import { Button, HStack, Text } from "@chakra-ui/react";
import { LuHash, LuListTree, LuGitBranch, LuBraces } from "react-icons/lu";

export interface IcuTemplate {
  id: string;
  label: string;
  icon: React.ReactNode;
  template: string;
  description: string;
}

export const ICU_TEMPLATES: IcuTemplate[] = [
  {
    id: "variable",
    label: "Variable",
    icon: <LuBraces />,
    template: "{variable}",
    description: "Variable simple",
  },
  {
    id: "plural",
    label: "Plural",
    icon: <LuHash />,
    template: `{count, plural,
  one {# item}
  other {# items}
}`,
    description: "Pluralisation avec nombre",
  },
  {
    id: "select",
    label: "Select",
    icon: <LuGitBranch />,
    template: `{gender, select,
  male {he}
  female {she}
  other {they}
}`,
    description: "Sélection conditionnelle",
  },
  {
    id: "selectordinal",
    label: "Ordinal",
    icon: <LuListTree />,
    template: `{position, selectordinal,
  one {#st}
  two {#nd}
  few {#rd}
  other {#th}
}`,
    description: "Nombres ordinaux (1er, 2ème...)",
  },
];

interface IcuTemplateButtonsProps {
  onInsertTemplate: (template: string) => void;
  disabled?: boolean;
}

export function IcuTemplateButtons({
  onInsertTemplate,
  disabled = false,
}: IcuTemplateButtonsProps) {
  return (
    <HStack gap={2} flexWrap="wrap">
      <Text fontSize="xs" color="gray.600" fontWeight="medium">
        Templates ICU :
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

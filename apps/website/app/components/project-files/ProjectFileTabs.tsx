import { HStack, Tabs, Badge, Code, IconButton } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { LuPlus, LuPencil } from "react-icons/lu";
import { FORMAT_LABELS, SupportedFormat } from "@transi-store/common";
import type { ProjectFile } from "../../../drizzle/schema";

type ProjectFileTabsProps = {
  files: Array<ProjectFile>;
  selectedFileId: number | null;
  onFileClick: (file: ProjectFile) => void;
  onEditFile: (file: ProjectFile) => void;
  onAddFile: () => void;
};

export function ProjectFileTabs({
  files,
  selectedFileId,
  onFileClick,
  onEditFile,
  onAddFile,
}: ProjectFileTabsProps) {
  const { t } = useTranslation();

  return (
    <Tabs.Root
      value={selectedFileId !== null ? String(selectedFileId) : undefined}
      variant="line"
      size="sm"
    >
      <HStack align="center" gap={2} wrap="wrap">
        <Tabs.List flex="1" minW={0}>
          {files.map((file) => (
            <HStack key={file.id} gap={0} align="center">
              <Tabs.Trigger
                value={String(file.id)}
                cursor="pointer"
                onClick={() => onFileClick(file)}
              >
                <Code fontSize="xs">{file.filePath}</Code>
                <Badge size="xs" ml={2}>
                  {FORMAT_LABELS[file.format as SupportedFormat] ?? file.format}
                </Badge>
              </Tabs.Trigger>
              <IconButton
                aria-label={t("files.editFile")}
                size="xs"
                variant="ghost"
                onClick={() => onEditFile(file)}
              >
                <LuPencil />
              </IconButton>
            </HStack>
          ))}
        </Tabs.List>
        <IconButton
          aria-label={t("files.addFile")}
          size="xs"
          variant="ghost"
          onClick={onAddFile}
        >
          <LuPlus />
        </IconButton>
      </HStack>
    </Tabs.Root>
  );
}

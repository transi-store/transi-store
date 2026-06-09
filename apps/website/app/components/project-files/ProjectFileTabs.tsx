import {
  HStack,
  Tabs,
  Badge,
  Code,
  IconButton,
  Box,
  Button,
  Menu,
  Portal,
} from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { LuPlus, LuPencil, LuChevronDown, LuCheck } from "react-icons/lu";
import { FORMAT_LABELS, SupportedFormat } from "@transi-store/common";
import type { ProjectFile } from "../../../drizzle/schema";
import { ProjectAccessRole } from "~/lib/project-visibility";
import { useOverflowDetection } from "./useOverflowDetection";

type ProjectFileTabsProps = {
  files: Array<ProjectFile>;
  selectedFileId: number | null;
  projectAccessRole: ProjectAccessRole;
  onFileClick: (file: ProjectFile) => void;
  onEditFile: (file: ProjectFile) => void;
  onAddFile: () => void;
};

function formatLabel(file: ProjectFile): string {
  return FORMAT_LABELS[file.format as SupportedFormat] ?? file.format;
}

export function ProjectFileTabs({
  files,
  selectedFileId,
  projectAccessRole,
  onFileClick,
  onEditFile,
  onAddFile,
}: ProjectFileTabsProps) {
  const { t } = useTranslation();
  const canEdit = projectAccessRole === ProjectAccessRole.MEMBER;

  // The tab strip is always rendered (hidden when overflowing) so its natural
  // width can keep being measured against the available slot width, even after
  // we switch to the menu. This keeps the detection reactive to resizes.
  const {
    containerRef: slotRef,
    contentRef: stripRef,
    isOverflowing,
  } = useOverflowDetection(files);

  const selectedFile =
    selectedFileId !== null
      ? (files.find((file) => file.id === selectedFileId) ?? null)
      : null;

  return (
    <Tabs.Root
      value={selectedFileId !== null ? String(selectedFileId) : undefined}
      variant="line"
      size="sm"
    >
      <HStack align="center" gap={2} wrap="nowrap">
        <Box
          ref={slotRef}
          flex="1"
          minW={0}
          position="relative"
          overflow="hidden"
          borderBottomWidth={isOverflowing ? "1px" : undefined}
          borderColor="border"
        >
          <Tabs.List
            ref={stripRef}
            flexWrap="nowrap"
            w={isOverflowing ? "max-content" : "100%"}
            position={isOverflowing ? "absolute" : "static"}
            visibility={isOverflowing ? "hidden" : "visible"}
            pointerEvents={isOverflowing ? "none" : undefined}
            aria-hidden={isOverflowing}
          >
            {files.map((file) => (
              <HStack key={file.id} gap={0} align="center" flexShrink={0}>
                <Tabs.Trigger
                  value={String(file.id)}
                  cursor="pointer"
                  onClick={() => onFileClick(file)}
                >
                  <Code fontSize="xs">{file.filePath}</Code>
                  <Badge size="xs" ml={2}>
                    {formatLabel(file)}
                  </Badge>
                </Tabs.Trigger>
                {canEdit && (
                  <IconButton
                    aria-label={t("files.editFile")}
                    size="xs"
                    variant="ghost"
                    onClick={() => onEditFile(file)}
                  >
                    <LuPencil />
                  </IconButton>
                )}
              </HStack>
            ))}
          </Tabs.List>

          {isOverflowing && (
            <Menu.Root>
              <Menu.Trigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  maxW="full"
                  borderRadius="0"
                  borderBottomWidth="2px"
                  borderBottomColor={
                    selectedFile ? "colorPalette.solid" : "transparent"
                  }
                >
                  {selectedFile ? (
                    <>
                      <Code fontSize="xs">{selectedFile.filePath}</Code>
                      <Badge size="xs" ml={2}>
                        {formatLabel(selectedFile)}
                      </Badge>
                    </>
                  ) : (
                    t("files.selectFile")
                  )}
                  <LuChevronDown />
                </Button>
              </Menu.Trigger>
              <Portal>
                <Menu.Positioner>
                  <Menu.Content maxH="20rem" minW="14rem">
                    {files.map((file) => (
                      <Menu.Item
                        key={file.id}
                        value={String(file.id)}
                        onClick={() => onFileClick(file)}
                      >
                        <Box w={4} flexShrink={0}>
                          {file.id === selectedFileId && <LuCheck />}
                        </Box>
                        <Code fontSize="xs">{file.filePath}</Code>
                        <Badge size="xs" ml={2}>
                          {formatLabel(file)}
                        </Badge>
                        <Box flex="1" />
                        {canEdit && (
                          <IconButton
                            aria-label={t("files.editFile")}
                            size="xs"
                            variant="ghost"
                            onClick={(event) => {
                              event.stopPropagation();
                              onEditFile(file);
                            }}
                          >
                            <LuPencil />
                          </IconButton>
                        )}
                      </Menu.Item>
                    ))}
                  </Menu.Content>
                </Menu.Positioner>
              </Portal>
            </Menu.Root>
          )}
        </Box>
        {canEdit && (
          <IconButton
            aria-label={t("files.addFile")}
            size="xs"
            variant="ghost"
            flexShrink={0}
            onClick={onAddFile}
          >
            <LuPlus />
          </IconButton>
        )}
      </HStack>
    </Tabs.Root>
  );
}

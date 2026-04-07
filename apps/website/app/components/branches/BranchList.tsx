import { Badge, Button, Card, HStack, Text, VStack } from "@chakra-ui/react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { LuGitBranch } from "react-icons/lu";
import { getBranchUrl } from "~/lib/routes-helpers";
import { BRANCH_STATUS } from "~/lib/branches";

type BranchListItem = {
  id: number;
  name: string;
  slug: string;
  status: BRANCH_STATUS;
  description: string | null;
  keyCount: number;
  deletionCount: number;
};

const STATUS_COLOR_MAP = {
  [BRANCH_STATUS.OPEN]: "green",
  [BRANCH_STATUS.MERGED]: "purple",
} as const;

type BranchListProps = {
  branches: BranchListItem[];
  organizationSlug: string;
  projectSlug: string;
};

export function BranchList({
  branches,
  organizationSlug,
  projectSlug,
}: BranchListProps) {
  const { t } = useTranslation();

  return (
    <VStack gap={3} align="stretch">
      {branches.map((branch) => (
        <Card.Root key={branch.id} size="sm">
          <Card.Body>
            <HStack justify="space-between" align="center">
              <VStack align="start" gap={1}>
                <HStack>
                  <LuGitBranch />
                  {branch.status === BRANCH_STATUS.OPEN ? (
                    <Link
                      to={getBranchUrl(
                        organizationSlug,
                        projectSlug,
                        branch.slug,
                      )}
                    >
                      <Text fontWeight="semibold">{branch.name}</Text>
                    </Link>
                  ) : (
                    <Text fontWeight="semibold" color="fg.muted">
                      {branch.name}
                    </Text>
                  )}
                  <Badge
                    colorPalette={STATUS_COLOR_MAP[branch.status]}
                    size="sm"
                  >
                    {t(`branches.status.${branch.status}`)}
                  </Badge>
                </HStack>
                {branch.description && (
                  <Text color="fg.muted" fontSize="sm">
                    {branch.description}
                  </Text>
                )}
              </VStack>
              <HStack gap={3}>
                {branch.status === BRANCH_STATUS.OPEN && (
                  <>
                    <Badge variant="outline" size="sm">
                      {t("branches.keysBadge", {
                        count: branch.keyCount,
                      })}
                    </Badge>
                    {branch.deletionCount > 0 && (
                      <Badge variant="outline" size="sm" colorPalette="red">
                        {t("branches.deletionsBadge", {
                          count: branch.deletionCount,
                        })}
                      </Badge>
                    )}
                    <Button asChild size="sm" variant="outline">
                      <Link
                        to={getBranchUrl(
                          organizationSlug,
                          projectSlug,
                          branch.slug,
                        )}
                      >
                        {t("translations.edit")}
                      </Link>
                    </Button>
                  </>
                )}
              </HStack>
            </HStack>
          </Card.Body>
        </Card.Root>
      ))}
    </VStack>
  );
}

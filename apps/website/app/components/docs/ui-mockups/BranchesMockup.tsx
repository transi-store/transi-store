import { Box } from "@chakra-ui/react";
import { BranchList } from "~/components/branches/BranchList";
import { BRANCH_STATUS } from "~/lib/branches";
import { MockupContainer } from "./MockupContainer";

const SAMPLE_BRANCHES = [
  {
    id: 1,
    name: "feature/add-checkout-translations",
    slug: "feature-add-checkout-translations",
    description: "New keys for the checkout flow",
    status: BRANCH_STATUS.OPEN,
    keyCount: 12,
    deletionCount: 0,
  },
  {
    id: 2,
    name: "fix/update-error-messages",
    slug: "fix-update-error-messages",
    description: null,
    status: BRANCH_STATUS.OPEN,
    keyCount: 5,
    deletionCount: 2,
  },
  {
    id: 3,
    name: "release/v2.1.0",
    slug: "release-v2-1-0",
    description: null,
    status: BRANCH_STATUS.MERGED,
    keyCount: 0,
    deletionCount: 0,
  },
];

export function BranchesMockup() {
  return (
    <MockupContainer url="transi-store.com/orgs/acme/projects/webapp/branches">
      {/* Real BranchList component with sample data — non-interactive */}
      <Box p={4} pointerEvents="none">
        <BranchList
          branches={SAMPLE_BRANCHES}
          organizationSlug="acme"
          projectSlug="webapp"
        />
      </Box>
    </MockupContainer>
  );
}

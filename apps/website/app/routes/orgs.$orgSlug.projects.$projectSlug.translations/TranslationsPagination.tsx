import { Center, ButtonGroup, IconButton, Pagination } from "@chakra-ui/react";
import { Link } from "react-router";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { getBranchUrl, getTranslationsUrl } from "~/lib/routes-helpers";
import type { TranslationFilter, TranslationKeysSort } from "~/lib/sort/keySort";

type TranslationsPaginationProps = {
  count: number;
  pageSize: number;
  currentPage: number;
  search?: string;
  sort: TranslationKeysSort;
  organizationSlug: string;
  projectSlug: string;
  branchSlug?: string;
  fileId?: number;
  locale?: string;
  filter?: TranslationFilter;
};

export function TranslationsPagination({
  count,
  pageSize,
  currentPage,
  search,
  sort,
  organizationSlug,
  projectSlug,
  branchSlug,
  fileId,
  locale,
  filter,
}: TranslationsPaginationProps) {
  const buildUrl = (page: number) => {
    const params = { search, page: String(page), sort, fileId, locale, filter };

    if (branchSlug) {
      return getBranchUrl(organizationSlug, projectSlug, branchSlug, params);
    }

    return getTranslationsUrl(organizationSlug, projectSlug, params);
  };

  return (
    <Center>
      <Pagination.Root count={count} pageSize={pageSize} defaultPage={1}>
        <ButtonGroup variant="outline">
          <Pagination.PrevTrigger asChild>
            <IconButton asChild>
              <Link to={buildUrl(currentPage - 1)}>
                <LuChevronLeft />
              </Link>
            </IconButton>
          </Pagination.PrevTrigger>

          <Pagination.Items
            render={(page) => (
              <IconButton
                asChild
                variant={{ base: "ghost", _selected: "outline" }}
              >
                <Link to={buildUrl(page.value)}>{page.value}</Link>
              </IconButton>
            )}
          />
          <Pagination.NextTrigger asChild>
            <IconButton asChild>
              <Link to={buildUrl(currentPage + 1)}>
                <LuChevronRight />
              </Link>
            </IconButton>
          </Pagination.NextTrigger>
        </ButtonGroup>
      </Pagination.Root>
    </Center>
  );
}

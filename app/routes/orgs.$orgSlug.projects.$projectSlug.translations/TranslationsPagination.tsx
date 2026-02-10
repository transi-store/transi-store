import { Center, ButtonGroup, IconButton, Pagination } from "@chakra-ui/react";
import { Link } from "react-router";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { getTranslationsUrl } from "~/lib/routes-helpers";

type TranslationsPaginationProps = {
  count: number;
  pageSize: number;
  currentPage: number;
  search?: string;
  sort: "alphabetical" | "createdAt" | "relevance";
  organizationSlug: string;
  projectSlug: string;
};

export function TranslationsPagination({
  count,
  pageSize,
  currentPage,
  search,
  sort,
  organizationSlug,
  projectSlug,
}: TranslationsPaginationProps) {
  const buildUrl = (page: number) => {
    return getTranslationsUrl(organizationSlug, projectSlug, {
      search,
      page: String(page),
      sort,
    });
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

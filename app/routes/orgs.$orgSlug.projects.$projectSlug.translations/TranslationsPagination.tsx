import { Center, ButtonGroup, IconButton, Pagination } from "@chakra-ui/react";
import { Link } from "react-router";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";

type TranslationsPaginationProps = {
  count: number;
  pageSize: number;
  currentPage: number;
  search?: string;
  organizationSlug: string;
  projectSlug: string;
};

export function TranslationsPagination({
  count,
  pageSize,
  currentPage,
  search,
  organizationSlug,
  projectSlug,
}: TranslationsPaginationProps) {
  const buildUrl = (page: number) => {
    const params = new URLSearchParams({
      ...(search && { search }),
      page: String(page),
    });
    return `/orgs/${organizationSlug}/projects/${projectSlug}/translations?${params}`;
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

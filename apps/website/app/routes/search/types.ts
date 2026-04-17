import type { Route } from "./+types";

export type SearchPageLoaderData = Route.ComponentProps["loaderData"];
export type SearchPageOrganization =
  SearchPageLoaderData["organizations"][number];
export type SearchPageResult = SearchPageLoaderData["results"][number];

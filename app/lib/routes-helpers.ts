import { generatePath } from "react-router";

export function getTranslationsUrl(
  orgSlug: string,
  projectSlug: string,
  queryParams?: { search?: string; page?: string; sort?: string },
): string {
  const params = new URLSearchParams();
  if (queryParams?.search) {
    params.set("search", queryParams.search);
  }
  if (queryParams?.page) {
    params.set("page", queryParams.page);
  }
  if (queryParams?.sort) {
    params.set("sort", queryParams.sort);
  }

  const baseUrl = generatePath(
    `/orgs/:orgSlug/projects/:projectSlug/translations`,
    {
      orgSlug,
      projectSlug,
    },
  );

  return params.size > 0 ? `${baseUrl}?${params.toString()}` : baseUrl;
}

export function getKeyUrl(
  orgSlug: string,
  projectSlug: string,
  keyId: number,
  queryParams?: { redirectTo?: string },
): string {
  const params = new URLSearchParams(queryParams);

  const baseUrl = generatePath(
    `/orgs/:orgSlug/projects/:projectSlug/keys/:keyId`,
    {
      orgSlug,
      projectSlug,
      keyId: String(keyId),
    },
  );

  return params.size > 0 ? `${baseUrl}?${params.toString()}` : baseUrl;
}

export function getRedirectUrlFromRequest(
  request: Request,
  defaultOrgSlug: string,
  defaultProjectSlug: string,
): string {
  const url = new URL(request.url);
  const redirectParam = url.searchParams.get("redirectTo");
  return (
    redirectParam ?? getTranslationsUrl(defaultOrgSlug, defaultProjectSlug)
  );
}

export function getRedirectUrlFromFormData(
  formData: FormData,
  defaultOrgSlug: string,
  defaultProjectSlug: string,
): string {
  const redirectUrl = formData.get("redirectUrl");
  return typeof redirectUrl === "string" && redirectUrl
    ? redirectUrl
    : getTranslationsUrl(defaultOrgSlug, defaultProjectSlug);
}

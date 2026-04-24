import { generatePath } from "react-router";

export function removeUndefinedValues<
  T extends Record<string, string | number | undefined | null>,
>(obj: T | undefined): Record<string, string> {
  if (!obj) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(obj)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)]),
  );
}

export function getProjectUrl(orgSlug: string, projectSlug: string): string {
  return generatePath(`/orgs/:orgSlug/projects/:projectSlug`, {
    orgSlug,
    projectSlug,
  });
}

export function getTranslationsUrl(
  orgSlug: string,
  projectSlug: string,
  queryParams?: {
    search?: string | null;
    page?: string | null;
    sort?: string | null;
    highlight?: string | null;
    fileId?: string | number | null;
  },
): string {
  const params = new URLSearchParams(removeUndefinedValues(queryParams));

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

export function getBranchesUrl(orgSlug: string, projectSlug: string): string {
  return generatePath(`/orgs/:orgSlug/projects/:projectSlug/branches`, {
    orgSlug,
    projectSlug,
  });
}

export function createNewBranchUrl(
  orgSlug: string,
  projectSlug: string,
): string {
  return generatePath(`/orgs/:orgSlug/projects/:projectSlug/branches/new`, {
    orgSlug,
    projectSlug,
  });
}

export function getBranchUrl(
  orgSlug: string,
  projectSlug: string,
  branchSlug: string,
  queryParams?: {
    search?: string | null;
    page?: string | null;
    sort?: string | null;
    highlight?: string | null;
    fileId?: string | number | null;
  },
): string {
  const params = new URLSearchParams(removeUndefinedValues(queryParams));

  const baseUrl = generatePath(
    `/orgs/:orgSlug/projects/:projectSlug/branches/:branchSlug`,
    { orgSlug, projectSlug, branchSlug },
  );

  return params.size > 0 ? `${baseUrl}?${params.toString()}` : baseUrl;
}

export function getBranchMergeUrl(
  orgSlug: string,
  projectSlug: string,
  branchSlug: string,
): string {
  return generatePath(
    `/orgs/:orgSlug/projects/:projectSlug/branches/:branchSlug/merge`,
    { orgSlug, projectSlug, branchSlug },
  );
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

import { generatePath } from "react-router";

export function removeUndefinedValues<
  T extends Record<string, string | undefined | null>,
>(obj: T | undefined): Record<string, string> {
  if (!obj) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(obj).filter(
      ([_, value]) => value !== undefined && value !== null,
    ),
  ) as Record<string, string>;
}

export function getTranslationsUrl(
  orgSlug: string,
  projectSlug: string,
  queryParams?: {
    search?: string | null;
    page?: string | null;
    sort?: string | null;
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

export function getTranslationsUrl(
  orgSlug: string,
  projectSlug: string,
  search?: string,
) {
  const baseUrl = `/orgs/${orgSlug}/projects/${projectSlug}/translations`;
  return search ? `${baseUrl}?search=${encodeURIComponent(search)}` : baseUrl;
}

export function getKeyUrl(orgSlug: string, projectSlug: string, keyId: number) {
  return `/orgs/${orgSlug}/projects/${projectSlug}/keys/${keyId}`;
}

export function getRedirectUrlFromRequest(
  request: Request,
  defaultOrgSlug: string,
  defaultProjectSlug: string,
): string {
  const url = new URL(request.url);
  const redirectParam = url.searchParams.get("redirect");
  const referer = request.headers.get("referer");
  return (
    redirectParam ||
    referer ||
    getTranslationsUrl(defaultOrgSlug, defaultProjectSlug)
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

export function createProjectNotFoundResponse(projectSlug: string): Response {
  return new Response(`Project "${projectSlug}" not found`, {
    status: 404,
  });
}

import { createContext, redirect, type MiddlewareFunction } from "react-router";
import {
  getOrganizationBySlug,
  isUserMemberOfOrganization,
} from "~/lib/organizations.server";
import { getProjectBySlug } from "~/lib/projects.server";
import { ProjectAccessRole, ProjectVisibility } from "~/lib/project-visibility";
import { createProjectNotFoundResponse } from "~/errors/response-errors/ProjectNotFoundResponse";
import { maybeUserContext, userContext } from "./auth";
import type { Organization, Project } from "../../drizzle/schema";

/**
 * Context that holds the role with which the current request can access the
 * scoped project. Set by either projectOptionalAccessMiddleware (allows
 * VIEWER on public projects) or projectMemberAccessMiddleware (asserts MEMBER).
 */
export const projectAccessRoleContext = createContext<ProjectAccessRole>();

/**
 * Context that holds the organization resolved by either project access
 * middleware. Loaders and actions on project routes should read this instead
 * of re-fetching by slug.
 */
export const organizationContext = createContext<Organization>();

/**
 * Context that holds the project resolved by either project access
 * middleware. Loaders and actions on project routes should read this instead
 * of re-fetching by slug.
 */
export const projectContext = createContext<Project>();

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Middleware to wire under the optional-user project layout, after the
 * access role middleware. Rejects mutating requests (POST/PUT/PATCH/DELETE)
 * when the resolved role is not MEMBER, so VIEWERs cannot reach actions.
 *
 * Loaders (GET/HEAD) are unaffected; the optional-user layout still serves
 * read-only viewer traffic on public projects.
 */
export const rejectViewerMutationsMiddleware: MiddlewareFunction = ({
  request,
  context,
}) => {
  if (
    MUTATION_METHODS.has(request.method) &&
    context.get(projectAccessRoleContext) !== ProjectAccessRole.MEMBER
  ) {
    throw new Response("Forbidden", { status: 403 });
  }
};

/**
 * Middleware for project routes that allow optional authentication:
 * authenticated members get MEMBER access, anyone else may view a public
 * project (VIEWER), and private projects redirect to the login page.
 *
 * Requires optionalSessionAuthMiddleware to have run first (maybeUserContext).
 */
export const projectOptionalAccessMiddleware: MiddlewareFunction = async ({
  request,
  params,
  context,
}) => {
  const maybeUser = context.get(maybeUserContext);

  if (!params.orgSlug || !params.projectSlug) {
    throw new Response("Organization slug and project slug are required", {
      status: 400,
    });
  }

  const organization = await getOrganizationBySlug(params.orgSlug);
  if (!organization) {
    throw new Response("Organization not found", { status: 404 });
  }

  const project = await getProjectBySlug(organization.id, params.projectSlug);
  if (!project) {
    throw createProjectNotFoundResponse(params.projectSlug);
  }

  context.set(organizationContext, organization);
  context.set(projectContext, project);

  if (
    maybeUser !== null &&
    (await isUserMemberOfOrganization(maybeUser.userId, organization.id))
  ) {
    context.set(projectAccessRoleContext, ProjectAccessRole.MEMBER);
    return;
  }

  if (project.visibility === ProjectVisibility.PUBLIC) {
    context.set(projectAccessRoleContext, ProjectAccessRole.VIEWER);
    return;
  }

  const url = new URL(request.url);
  throw redirect(`/auth/login?redirectTo=${encodeURIComponent(url.pathname)}`);
};

/**
 * Middleware for project routes that require organization membership.
 * Sets organizationContext, projectContext and projectAccessRoleContext
 * (= MEMBER), or throws 403 / project-not-found.
 *
 * Requires sessionAuthMiddleware to have run first (userContext).
 */
export const projectMemberAccessMiddleware: MiddlewareFunction = async ({
  params,
  context,
}) => {
  const user = context.get(userContext);

  if (!params.orgSlug || !params.projectSlug) {
    throw new Response("Organization slug and project slug are required", {
      status: 400,
    });
  }

  const organization = await getOrganizationBySlug(params.orgSlug);
  if (!organization) {
    throw new Response("Organization not found", { status: 404 });
  }

  const isMember = await isUserMemberOfOrganization(
    user.userId,
    organization.id,
  );
  if (!isMember) {
    throw new Response("Forbidden", { status: 403 });
  }

  const project = await getProjectBySlug(organization.id, params.projectSlug);
  if (!project) {
    throw createProjectNotFoundResponse(params.projectSlug);
  }

  context.set(organizationContext, organization);
  context.set(projectContext, project);
  context.set(projectAccessRoleContext, ProjectAccessRole.MEMBER);
};

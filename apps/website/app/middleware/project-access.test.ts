import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RouterContextProvider, type MiddlewareFunction } from "react-router";
import * as schema from "../../drizzle/schema";
import {
  cleanupDb,
  createOrganization,
  createProject,
  getTestDb,
} from "../../tests/test-db";
import {
  organizationContext,
  projectAccessRoleContext,
  projectContext,
  projectMemberAccessMiddleware,
  projectOptionalAccessMiddleware,
  rejectViewerMutationsMiddleware,
} from "./project-access.server";
import { maybeUserContext, userContext } from "./auth.server";
import { ProjectAccessRole, ProjectVisibility } from "~/lib/project-visibility";
import type { OAuthProvider } from "~/lib/auth-providers";
import type { SessionData } from "~/lib/session.server";

vi.mock("~/lib/db.server", () => ({
  get db() {
    return getTestDb();
  },
  schema,
}));

async function createUser(email: string): Promise<SessionData> {
  const [user] = await getTestDb()
    .insert(schema.users)
    .values({
      email,
      name: "Test",
      oauthProvider: "test" as OAuthProvider,
      oauthSubject: `subject-${email}`,
    })
    .returning();
  return { userId: user.id, email: user.email };
}

async function addMembership(userId: number, organizationId: number) {
  await getTestDb().insert(schema.organizationMembers).values({
    userId,
    organizationId,
  });
}

function newRequest(
  method = "GET",
  url = "https://example.com/orgs/o/projects/p",
) {
  return new Request(url, { method });
}

// MiddlewareFunction in our project access middleware uses positional
// destructuring of { request, params, context } and never calls next, so
// invoking it with that single arg is enough for unit tests.
type MiddlewareInvocationArgs = {
  request: Request;
  params: Record<string, string | undefined>;
  context: RouterContextProvider;
};

function invoke(
  middleware: MiddlewareFunction,
  args: MiddlewareInvocationArgs,
) {
  return (middleware as unknown as (args: MiddlewareInvocationArgs) => unknown)(
    args,
  );
}

describe("projectMemberAccessMiddleware", () => {
  let org: schema.Organization;
  let user: SessionData;

  beforeEach(async () => {
    org = await createOrganization(getTestDb(), { slug: "test-org" });
    user = await createUser("member@example.com");
    await addMembership(user.userId, org.id);
  });

  afterEach(async () => {
    await cleanupDb();
  });

  function setupContext() {
    const ctx = new RouterContextProvider();
    ctx.set(userContext, user);
    return ctx;
  }

  it("sets organization, project and MEMBER role for an org member", async () => {
    const project = await createProject(getTestDb(), org.id, {
      slug: "my-project",
    });
    const ctx = setupContext();

    await invoke(projectMemberAccessMiddleware, {
      request: newRequest(),
      params: { orgSlug: "test-org", projectSlug: "my-project" },
      context: ctx,
    });

    expect(ctx.get(organizationContext).id).toBe(org.id);
    expect(ctx.get(projectContext).id).toBe(project.id);
    expect(ctx.get(projectAccessRoleContext)).toBe(ProjectAccessRole.MEMBER);
  });

  it("throws 400 when orgSlug param is missing", async () => {
    const ctx = setupContext();

    await expect(
      invoke(projectMemberAccessMiddleware, {
        request: newRequest(),
        params: { projectSlug: "p" },
        context: ctx,
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("throws 400 when projectSlug param is missing", async () => {
    const ctx = setupContext();

    await expect(
      invoke(projectMemberAccessMiddleware, {
        request: newRequest(),
        params: { orgSlug: "test-org" },
        context: ctx,
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("throws 404 when the organization does not exist", async () => {
    const ctx = setupContext();

    await expect(
      invoke(projectMemberAccessMiddleware, {
        request: newRequest(),
        params: { orgSlug: "missing", projectSlug: "p" },
        context: ctx,
      }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("throws 403 when the user is not a member", async () => {
    await createProject(getTestDb(), org.id, { slug: "my-project" });
    const stranger = await createUser("stranger@example.com");
    const ctx = new RouterContextProvider();
    ctx.set(userContext, stranger);

    await expect(
      invoke(projectMemberAccessMiddleware, {
        request: newRequest(),
        params: { orgSlug: "test-org", projectSlug: "my-project" },
        context: ctx,
      }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("throws 404 when the project does not exist", async () => {
    const ctx = setupContext();

    await expect(
      invoke(projectMemberAccessMiddleware, {
        request: newRequest(),
        params: { orgSlug: "test-org", projectSlug: "missing" },
        context: ctx,
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("projectOptionalAccessMiddleware", () => {
  let org: schema.Organization;

  beforeEach(async () => {
    org = await createOrganization(getTestDb(), { slug: "test-org" });
  });

  afterEach(async () => {
    await cleanupDb();
  });

  function setupContext(maybeUser: SessionData | null) {
    const ctx = new RouterContextProvider();
    ctx.set(maybeUserContext, maybeUser);
    return ctx;
  }

  it("sets MEMBER when the authenticated user is an org member", async () => {
    const project = await createProject(getTestDb(), org.id, {
      slug: "my-project",
      visibility: ProjectVisibility.PRIVATE,
    });
    const user = await createUser("member@example.com");
    await addMembership(user.userId, org.id);
    const ctx = setupContext(user);

    await invoke(projectOptionalAccessMiddleware, {
      request: newRequest(),
      params: { orgSlug: "test-org", projectSlug: "my-project" },
      context: ctx,
    });

    expect(ctx.get(projectAccessRoleContext)).toBe(ProjectAccessRole.MEMBER);
    expect(ctx.get(projectContext).id).toBe(project.id);
    expect(ctx.get(organizationContext).id).toBe(org.id);
  });

  it("sets VIEWER for an anonymous request on a public project", async () => {
    const project = await createProject(getTestDb(), org.id, {
      slug: "public-project",
      visibility: ProjectVisibility.PUBLIC,
    });
    const ctx = setupContext(null);

    await invoke(projectOptionalAccessMiddleware, {
      request: newRequest(),
      params: { orgSlug: "test-org", projectSlug: "public-project" },
      context: ctx,
    });

    expect(ctx.get(projectAccessRoleContext)).toBe(ProjectAccessRole.VIEWER);
    expect(ctx.get(projectContext).id).toBe(project.id);
  });

  it("sets VIEWER for an authenticated non-member on a public project", async () => {
    await createProject(getTestDb(), org.id, {
      slug: "public-project",
      visibility: ProjectVisibility.PUBLIC,
    });
    const stranger = await createUser("stranger@example.com");
    const ctx = setupContext(stranger);

    await invoke(projectOptionalAccessMiddleware, {
      request: newRequest(),
      params: { orgSlug: "test-org", projectSlug: "public-project" },
      context: ctx,
    });

    expect(ctx.get(projectAccessRoleContext)).toBe(ProjectAccessRole.VIEWER);
  });

  it("redirects to /auth/login for an anonymous request on a private project", async () => {
    await createProject(getTestDb(), org.id, {
      slug: "private-project",
      visibility: ProjectVisibility.PRIVATE,
    });
    const ctx = setupContext(null);

    try {
      await invoke(projectOptionalAccessMiddleware, {
        request: newRequest(
          "GET",
          "https://example.com/orgs/test-org/projects/private-project",
        ),
        params: { orgSlug: "test-org", projectSlug: "private-project" },
        context: ctx,
      });
      expect.fail("middleware should have thrown a redirect");
    } catch (e) {
      const response = e as Response;
      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe(
        "/auth/login?redirectTo=%2Forgs%2Ftest-org%2Fprojects%2Fprivate-project",
      );
    }
  });

  it("redirects to /auth/login for an authenticated non-member on a private project", async () => {
    await createProject(getTestDb(), org.id, {
      slug: "private-project",
      visibility: ProjectVisibility.PRIVATE,
    });
    const stranger = await createUser("stranger@example.com");
    const ctx = setupContext(stranger);

    await expect(
      invoke(projectOptionalAccessMiddleware, {
        request: newRequest(),
        params: { orgSlug: "test-org", projectSlug: "private-project" },
        context: ctx,
      }),
    ).rejects.toMatchObject({ status: 302 });
  });

  it("throws 400 when params are missing", async () => {
    const ctx = setupContext(null);

    await expect(
      invoke(projectOptionalAccessMiddleware, {
        request: newRequest(),
        params: {},
        context: ctx,
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("throws 404 when the organization does not exist", async () => {
    const ctx = setupContext(null);

    await expect(
      invoke(projectOptionalAccessMiddleware, {
        request: newRequest(),
        params: { orgSlug: "missing", projectSlug: "p" },
        context: ctx,
      }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("throws 404 when the project does not exist", async () => {
    const ctx = setupContext(null);

    await expect(
      invoke(projectOptionalAccessMiddleware, {
        request: newRequest(),
        params: { orgSlug: "test-org", projectSlug: "missing" },
        context: ctx,
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("rejectViewerMutationsMiddleware", () => {
  function setupContext(role: ProjectAccessRole) {
    const ctx = new RouterContextProvider();
    ctx.set(projectAccessRoleContext, role);
    return ctx;
  }

  it("lets a GET request through for a VIEWER", () => {
    const ctx = setupContext(ProjectAccessRole.VIEWER);

    expect(() =>
      invoke(rejectViewerMutationsMiddleware, {
        request: newRequest("GET"),
        params: {},
        context: ctx,
      }),
    ).not.toThrow();
  });

  it("lets a HEAD request through for a VIEWER", () => {
    const ctx = setupContext(ProjectAccessRole.VIEWER);

    expect(() =>
      invoke(rejectViewerMutationsMiddleware, {
        request: newRequest("HEAD"),
        params: {},
        context: ctx,
      }),
    ).not.toThrow();
  });

  it("lets a POST request through for a MEMBER", () => {
    const ctx = setupContext(ProjectAccessRole.MEMBER);

    expect(() =>
      invoke(rejectViewerMutationsMiddleware, {
        request: newRequest("POST"),
        params: {},
        context: ctx,
      }),
    ).not.toThrow();
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"])(
    "throws 403 on %s when the role is VIEWER",
    (method) => {
      const ctx = setupContext(ProjectAccessRole.VIEWER);

      try {
        invoke(rejectViewerMutationsMiddleware, {
          request: newRequest(method),
          params: {},
          context: ctx,
        });
        expect.fail("middleware should have thrown 403");
      } catch (e) {
        const response = e as Response;
        expect(response.status).toBe(403);
      }
    },
  );
});

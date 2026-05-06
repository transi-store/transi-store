import { Outlet } from "react-router";
import { sessionAuthMiddleware } from "~/middleware/auth.server";
import { projectMemberAccessMiddleware } from "~/middleware/project-access.server";
import type { Route } from "./+types/project-required-user-layout";

export const middleware = [
  sessionAuthMiddleware,
  projectMemberAccessMiddleware,
];

/**
 * Force middleware to run on every client-side navigation,
 * even for routes without their own loader.
 */
export async function loader() {
  return null;
}

export default function ProjectRequiredUserLayout(
  _props: Route.ComponentProps,
) {
  return <Outlet />;
}

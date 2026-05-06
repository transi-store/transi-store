import { Outlet } from "react-router";
import { optionalSessionAuthMiddleware } from "~/middleware/auth";
import {
  projectOptionalAccessMiddleware,
  rejectViewerMutationsMiddleware,
} from "~/middleware/project-access";
import type { Route } from "./+types/project-optional-user-layout";

export const middleware = [
  optionalSessionAuthMiddleware,
  projectOptionalAccessMiddleware,
  rejectViewerMutationsMiddleware,
];

/**
 * Force middleware to run on every client-side navigation,
 * even for routes without their own loader.
 */
export async function loader() {
  return null;
}

export default function ProjectOptionalUserLayout(
  _props: Route.ComponentProps,
) {
  return <Outlet />;
}

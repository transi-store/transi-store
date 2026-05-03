import { Outlet } from "react-router";
import { optionalSessionAuthMiddleware } from "~/middleware/auth";
import type { Route } from "./+types/project-viewer-layout";

export const middleware = [optionalSessionAuthMiddleware];

/**
 * Force middleware to run on every client-side navigation,
 * even for routes without their own loader.
 */
export async function loader() {
  return null;
}

export default function ProjectViewerLayout(_props: Route.ComponentProps) {
  return <Outlet />;
}

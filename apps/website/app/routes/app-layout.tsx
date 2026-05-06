import { Outlet } from "react-router";
import { sessionAuthMiddleware } from "~/middleware/auth.server";
import type { Route } from "./+types/app-layout";

export const middleware = [sessionAuthMiddleware];

/**
 * Force middleware to run on every client-side navigation,
 * even for routes without their own loader.
 */
export async function loader() {
  return null;
}

export default function AppLayout(_props: Route.ComponentProps) {
  return <Outlet />;
}

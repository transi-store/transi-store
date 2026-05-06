import { apiAuthMiddleware } from "~/middleware/api-auth.server";

export const middleware = [apiAuthMiddleware];

/**
 * Force middleware to run on every request.
 */
export async function loader() {
  return null;
}

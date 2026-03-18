import { apiAuthMiddleware } from "~/middleware/api-auth";

export const middleware = [apiAuthMiddleware];

/**
 * Force middleware to run on every request.
 */
export async function loader() {
  return null;
}

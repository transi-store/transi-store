import { apiOrgMiddleware } from "~/middleware/api-auth.server";

export const middleware = [apiOrgMiddleware];

/**
 * Force middleware to run on every request.
 */
export async function loader() {
  return null;
}

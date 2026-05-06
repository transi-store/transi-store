import type { MiddlewareFunction } from "react-router";
import { withQueryCounter, getQueryCount } from "~/lib/query-counter.server";

/**
 * React Router middleware that counts database queries per request (dev only).
 * Adds X-DB-Query-Count header to the response and logs to console.
 */
export const queryCounterMiddleware: MiddlewareFunction<Response> = async (
  { request },
  next,
) => {
  if (process.env.NODE_ENV === "production") {
    return await next();
  }

  return withQueryCounter(async () => {
    const response = await next();

    const count = getQueryCount();
    const url = new URL(request.url);

    if (count > 0) {
      console.log(`[DB] ${request.method} ${url.pathname} — ${count} queries`);
    }

    // Clone the response to add the header
    const newResponse = new Response(response.body, response);
    newResponse.headers.set("X-DB-Query-Count", String(count));

    return newResponse;
  });
};

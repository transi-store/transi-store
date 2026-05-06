/**
 * Returns a JSON error response with a consistent { error } envelope.
 * Use this in all API middleware and routes so the error shape stays uniform.
 */
export function apiError(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}

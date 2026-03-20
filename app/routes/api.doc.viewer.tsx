import type { Route } from "./+types/api.doc.viewer";

export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const theme = url.searchParams.get("theme") === "dark" ? "dark" : "light";

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Transi-Store API</title>
    <style>
      body { margin: 0; padding: 0; }
    </style>
  </head>
  <body>
    <script
      id="api-reference"
      data-url="/api/doc.json"
      data-configuration='{"theme":"${theme}"}'
    ></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

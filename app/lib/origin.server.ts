export function getOrigin(request: Request): string {
  // Déterminer l'origine à partir de la requête pour le rendu côté serveur
  const url = new URL(request.url);
  const origin = url.origin;

  return origin;
}

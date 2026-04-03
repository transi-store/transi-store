export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Supprimer les accents
    .replace(/[^a-z0-9.]+/g, "-") // Remplacer les caractères spéciaux par des tirets (sauf les points)
    .replace(/-*\.-*/g, ".") // Supprimer les tirets autour des points
    .replace(/^[-]+|[-]+$/g, ""); // Supprimer les tirets en début/fin
}

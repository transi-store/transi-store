export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9.]+/g, "-") // Replace special characters with dashes (except dots)
    .replace(/-*\.-*/g, ".") // Remove dashes around dots
    .replace(/^[-]+|[-]+$/g, ""); // Remove leading/trailing dashes
}

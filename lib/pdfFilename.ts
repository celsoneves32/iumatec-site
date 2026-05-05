export function slugifyFilename(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export function buildProductPdfFilename(input: {
  title?: string;
  sku?: string;
}) {
  const titlePart = slugifyFilename(input.title || "produkt");
  const skuPart = slugifyFilename(input.sku || "iumatec");

  return `${titlePart}-${skuPart}-datenblatt.pdf`;
}
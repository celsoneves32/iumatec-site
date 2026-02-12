// lib/categories.ts

export type CategoryItem = {
  title: string;
  handle: string; // usa o handle da Collection no Shopify (ex: "smartphones")
};

export type CategorySection = {
  title: string;
  handle: string; // pode ser igual ao item/handle (simples)
  items?: CategoryItem[];
};

export type FoundCategory = {
  section: CategorySection;
  item?: CategoryItem;
};

/**
 * Estrutura simples:
 * - Cada "section" é uma categoria direta (sem sub-items)
 * - Se no futuro quiseres subcategorias, adicionas "items"
 */
export const CATEGORY_SECTIONS: CategorySection[] = [
  { title: "Smartphones", handle: "smartphones" },
  { title: "Laptops", handle: "laptops" },
  { title: "Acessórios", handle: "accessories" },
  { title: "Gaming", handle: "gaming" }
];

export function findCategoryByHandle(handle: string): FoundCategory | null {
  const h = (handle || "").toLowerCase();

  for (const section of CATEGORY_SECTIONS) {
    if (section.handle.toLowerCase() === h) {
      return { section };
    }

    const items = section.items ?? [];
    for (const item of items) {
      if (item.handle.toLowerCase() === h) {
        return { section, item };
      }
    }
  }

  return null;
}

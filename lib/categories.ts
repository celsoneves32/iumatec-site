// lib/categories.ts

export type Category = {
  title: string;
  handle: string; // slug
  href: string;
};

export const categories: Category[] = [
  { title: "Smartphones", handle: "smartphones", href: "/collections/smartphones" },
  { title: "Laptops", handle: "laptops", href: "/collections/laptops" },
  { title: "Acessórios", handle: "accessories", href: "/collections/accessories" },
  { title: "Gaming", handle: "gaming", href: "/collections/gaming" }
];

export function getCategoryByHandle(handle: string): Category | null {
  return categories.find((c) => c.handle === handle) ?? null;
}

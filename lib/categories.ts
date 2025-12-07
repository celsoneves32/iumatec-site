// lib/categories.ts

export type CategoryConfig = {
  slug: string;            // usado na URL: /kategorie/slug
  title: string;           // texto que o cliente vê
  description?: string;
  shopifyHandle: string;   // normalmente igual ao slug
  parentSlug?: string;     // para subcategorias (ex.: "computer-gaming")
};

// 🔹 lista com todos os departamentos + subcategorias
export const CATEGORIES: CategoryConfig[] = [
  // ---- Top-Level / Sortiment ----
  {
    slug: "computer-gaming",
    title: "Computer & Gaming",
    description:
      "Notebooks, PCs, Gaming und Zubehör – alles für Homeoffice und Entertainment.",
    shopifyHandle: "computer-gaming",
  },
  {
    slug: "telefonie-tablet-smartwatch",
    title: "Telefonie, Tablet & Smartwatch",
    description:
      "Smartphones, Tablets und Wearables für Alltag, Arbeit und Freizeit.",
    shopifyHandle: "telefonie-tablet-smartwatch",
  },
  {
    slug: "tv-audio",
    title: "TV & Audio",
    description:
      "Fernseher, Soundbars und Heimkino-Systeme für dein Wohnzimmer.",
    shopifyHandle: "tv-audio",
  },
  {
    slug: "baumarkt",
    title: "Baumarkt",
    description:
      "Werkzeug, Maschinen und Zubehör für deine Projekte zu Hause.",
    shopifyHandle: "baumarkt",
  },
  {
    slug: "haushalt-kueche",
    title: "Haushalt & Küche",
    description:
      "Haushaltsgeräte und Küchenhelfer für deinen Alltag.",
    shopifyHandle: "haushalt-kueche",
  },
  {
    slug: "garten-grill",
    title: "Garten & Grill",
    description:
      "Alles für Gartenpflege und Grillabende.",
    shopifyHandle: "garten-grill",
  },
  {
    slug: "wohnen-licht",
    title: "Wohnen & Licht",
    description:
      "Beleuchtung und Wohnaccessoires für dein Zuhause.",
    shopifyHandle: "wohnen-licht",
  },
  {
    slug: "spielwaren-drohnen",
    title: "Spielwaren & Drohnen",
    description:
      "Spielzeuge, Drohnen und Gadgets für Gross und Klein.",
    shopifyHandle: "spielwaren-drohnen",
  },
  {
    slug: "beauty-gesundheit",
    title: "Beauty & Gesundheit",
    description:
      "Pflegeprodukte, Beauty-Gadgets und Gesundheit.",
    shopifyHandle: "beauty-gesundheit",
  },
  {
    slug: "erotik",
    title: "Erotik",
    description:
      "Diskrete Auswahl an Erotikprodukten.",
    shopifyHandle: "erotik",
  },
  {
    slug: "buero-papeterie",
    title: "Büro & Papeterie",
    description:
      "Alles fürs Büro – Papier, Druck und Organisation.",
    shopifyHandle: "buero-papeterie",
  },
  {
    slug: "freizeit-sport",
    title: "Freizeit & Sport",
    description:
      "Ausrüstung und Zubehör für deine Freizeit und Sportaktivitäten.",
    shopifyHandle: "freizeit-sport",
  },
  {
    slug: "foto-video",
    title: "Foto & Video",
    description:
      "Kameras, Objektive und Zubehör für Foto und Video.",
    shopifyHandle: "foto-video",
  },
  {
    slug: "baby-familie",
    title: "Baby & Familie",
    description:
      "Produkte für Babys, Kinder und Familienalltag.",
    shopifyHandle: "baby-familie",
  },
  {
    slug: "tierbedarf",
    title: "Tierbedarf",
    description:
      "Futter, Zubehör und Pflege für deine Haustiere.",
    shopifyHandle: "tierbedarf",
  },
  {
    slug: "medien-buecher",
    title: "Medien & Bücher",
    description:
      "Bücher, Filme, Musik und mehr.",
    shopifyHandle: "medien-buecher",
  },

  // ---- Exemplo de subcategorias de Computer & Gaming ----
  { slug: "gaming", title: "Gaming", shopifyHandle: "gaming", parentSlug: "computer-gaming" },
  { slug: "spielkonsolen", title: "Spielkonsolen", shopifyHandle: "spielkonsolen", parentSlug: "computer-gaming" },
  { slug: "spielkonsolen-games", title: "Spielkonsolen Games", shopifyHandle: "spielkonsolen-games", parentSlug: "computer-gaming" },
  { slug: "spielkonsolen-zubehoer", title: "Spielkonsolen Zubehör", shopifyHandle: "spielkonsolen-zubehoer", parentSlug: "computer-gaming" },
  { slug: "pc-games", title: "PC Games", shopifyHandle: "pc-games", parentSlug: "computer-gaming" },
  { slug: "vr-brillen", title: "VR-Brillen", shopifyHandle: "vr-brillen", parentSlug: "computer-gaming" },
  { slug: "gamecards-prepaid-karten", title: "Gamecards & Prepaid-Karten", shopifyHandle: "gamecards-prepaid-karten", parentSlug: "computer-gaming" },
  { slug: "spielsteuerungen", title: "Spielsteuerungen", shopifyHandle: "spielsteuerungen", parentSlug: "computer-gaming" },
  { slug: "gaming-stuehle", title: "Gaming Stühle", shopifyHandle: "gaming-stuehle", parentSlug: "computer-gaming" },

  // aqui seguiriam Notebooks, Software, Drucker & Scanner, etc.
  // sempre com parentSlug: "computer-gaming" e shopifyHandle = o handle que definimos acima.
];

export function getCategoryBySlug(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug);
}

// lib/categories.ts
// Mapeamento das categorias principais e subcategorias para Shopify (handles das Collections)

export type CategoryItem = {
  title: string;
  handle: string; // Shopify collection handle
};

export type MegaMenuSection = {
  title: string;   // título que aparece no menu
  handle: string;  // collection principal
  children: CategoryItem[];
};

// Categorias de topo (menu principal)
export const TOP_LEVEL_CATEGORIES: { title: string; handle: string }[] = [
  { title: "Computer & Gaming", handle: "computer-gaming" },
  { title: "Telefonie, Tablet & Smartwatch", handle: "telefonie-tablet-und-smartwatch" },
  { title: "TV & Audio", handle: "tv-und-audio" },
  { title: "Haushalt & Küche", handle: "haushalt-und-kueche" },
  { title: "Garten & Grill", handle: "garten-und-grill" },
  { title: "Foto & Video", handle: "foto-und-video" },
  { title: "Zubehör & Kabel", handle: "zubehoer-und-kabel" },
  { title: "Aktionen", handle: "aktionen" },
];

// Mega-menu APENAS para o bloco "Computer & Gaming"
export const MEGA_MENU: MegaMenuSection[] = [
  // BLOCO: Computer & Gaming
  {
    title: "Computer & Gaming",
    handle: "computer-gaming",
    children: [
      { title: "Gaming", handle: "gaming" },
      { title: "Spielkonsolen", handle: "spielkonsolen" },
      { title: "Spielkonsolen Games", handle: "spielkonsolen-games" },
      { title: "Spielkonsolen Zubehör", handle: "spielkonsolen-und-zubehoer" },
      { title: "PC Games", handle: "pc-games" },
      { title: "VR-Brillen", handle: "vr-brillen" },
      { title: "Gaming Stühle", handle: "gaming-stuehle" },
      { title: "Spielsteuerungen", handle: "spielsteuerungen" },
      {
        title: "Gamecards & Prepaid-Karten",
        handle: "gamecards-und-prepaid-karten",
      },
    ],
  },

  // BLOCO: Notebooks
  {
    title: "Notebooks",
    handle: "notebooks",
    children: [
      { title: "Notebook Akku", handle: "notebook-akkus" },
      {
        title: "Notebook Bildschirmfolie",
        handle: "notebook-bildschirm-und-schutzfolien",
      },
      { title: "Notebook Dockingstation", handle: "notebook-dockingstationen" },
      { title: "Notebook Netzteil", handle: "notebook-netzteile" },
      {
        title: "Notebook Sicherheitsschloss",
        handle: "notebook-sicherheitsschloesser",
      },
      { title: "Notebook Zubehör", handle: "notebook-zubehoer" },
      {
        title: "Taschen & Hüllen Notebooks",
        handle: "notebook-taschen-und-huellen",
      },
    ],
  },

  // BLOCO: Drucker & Scanner
  {
    title: "Drucker & Scanner",
    handle: "drucker-und-scanner",
    children: [
      { title: "3D Drucker", handle: "3d-drucker" },
      { title: "3D Druckmaterial", handle: "3d-druckmaterial-und-filamente" },
      { title: "Tintendrucker", handle: "tintendrucker" },
      { title: "Laserdrucker", handle: "laserdrucker" },
      { title: "Scanner", handle: "scanner" },
      {
        title: "Druckerpatronen & Toner",
        handle: "druckerpatronen-und-toner",
      },
      { title: "Tintenpatronen", handle: "tintenpatronen" },
      { title: "Toner & Trommeln", handle: "toner-und-trommeln" },
    ],
  },

  // BLOCO: Peripherie
  {
    title: "Peripherie",
    handle: "pc-peripherie",
    children: [
      { title: "Mäuse", handle: "pc-maeuse" },
      { title: "Tastaturen", handle: "pc-tastaturen" },
      { title: "Webcams", handle: "webcams" },
      { title: "PC Audio", handle: "pc-audio-und-headsets" },
      {
        title: "Grafiktablets",
        handle: "grafiktablets-und-zeichentablets",
      },
    ],
  },

  // BLOCO: Speicher & Laufwerke
  {
    title: "Speicher & Laufwerke",
    handle: "speicher-und-laufwerke",
    children: [
      { title: "SSD", handle: "ssd-festplatten" },
      { title: "HDD Festplatten", handle: "hdd-festplatten" },
      { title: "USB Sticks", handle: "usb-sticks-und-speichersticks" },
      { title: "Crypto Wallet", handle: "hardware-und-crypto-wallets" },
    ],
  },

  // BLOCO: PC Komponenten
  {
    title: "PC Komponenten",
    handle: "pc-komponenten",
    children: [
      { title: "Prozessoren", handle: "pc-prozessoren" },
      { title: "Arbeitsspeicher (RAM)", handle: "arbeitsspeicher-ram" },
      { title: "Grafikkarten (GPU)", handle: "grafikkarten-gpu" },
      { title: "Gehäuse", handle: "pc-gehaeuse" },
      { title: "Netzteile", handle: "pc-netzteile" },
    ],
  },

  // BLOCO: PCs & Monitore
  {
    title: "PCs & Monitore",
    handle: "pcs-und-monitore",
    children: [
      { title: "Tower & Desktop PCs", handle: "tower-und-desktop-pcs" },
      { title: "Monitore", handle: "pc-monitore" },
      {
        title: "Monitor Zubehör",
        handle: "monitor-zubehoer-und-halterungen",
      },
    ],
  },

  // BLOCO: Computer Kabel & Adapter
  {
    title: "Computer Kabel & Adapter",
    handle: "computer-kabel-und-adapter",
    children: [],
  },
];

// encontra uma categoria (para página /kategorie/[handle])
export function findCategoryByHandle(handle: string) {
  // 1) procurar nas secções do mega-menu
  for (const section of MEGA_MENU) {
    if (section.handle === handle) {
      return { section, item: null as CategoryItem | null };
    }
    const found = section.children.find((c) => c.handle === handle);
    if (found) {
      return { section, item: found };
    }
  }

  // 2) se não encontrar, ver se é uma categoria de topo (TV & Audio, Haushalt, etc.)
  const top = TOP_LEVEL_CATEGORIES.find((c) => c.handle === handle);
  if (top) {
    return {
      section: { title: top.title, handle: top.handle, children: [] },
      item: null as CategoryItem | null,
    };
  }

  return null;
}

// lib/categories.ts

export type CategoryConfig = {
  slug: string;            // usado na URL: /kategorie/[slug]
  title: string;           // texto visível para o cliente
  description?: string;    // opcional
  shopifyHandle: string;   // Collection handle no Shopify
  parentSlug?: string;     // para subcategorias
};

/* --------------------------------------------------
   Top-Level Categoria: Computer & Gaming
   -------------------------------------------------- */

export const CATEGORIES: CategoryConfig[] = [
  {
    slug: "computer-gaming",
    title: "Computer & Gaming",
    description:
      "Alles für Gaming, Arbeiten und Entertainment – vom Notebook über Gaming-Stühle bis hin zu Komponenten.",
    shopifyHandle: "computer-gaming",
  },

  /* --------------------------------------------------
     Subkategorie Gruppe 1: Gaming
     -------------------------------------------------- */

  {
    slug: "gaming",
    title: "Gaming",
    description: "Gaming-Produkte für PC und Konsole.",
    shopifyHandle: "gaming",
    parentSlug: "computer-gaming",
  },
  {
    slug: "spielkonsolen",
    title: "Spielkonsolen",
    description: "PlayStation, Xbox, Nintendo und mehr.",
    shopifyHandle: "spielkonsolen",
    parentSlug: "computer-gaming",
  },
  {
    slug: "spielkonsolen-games",
    title: "Spielkonsolen Games",
    description: "Games für PS5, Xbox, Switch & mehr.",
    shopifyHandle: "spielkonsolen-games",
    parentSlug: "computer-gaming",
  },
  {
    slug: "spielkonsolen-zubehoer",
    title: "Spielkonsolen Zubehör",
    description: "Controller, Headsets, Ladestationen & mehr.",
    shopifyHandle: "spielkonsolen-zubehoer",
    parentSlug: "computer-gaming",
  },
  {
    slug: "pc-games",
    title: "PC Games",
    description: "Spiele für Windows PC und Gaming-Laptops.",
    shopifyHandle: "pc-games",
    parentSlug: "computer-gaming",
  },
  {
    slug: "vr-brillen",
    title: "VR-Brillen",
    description: "Virtuelle Realität – Headsets & Zubehör.",
    shopifyHandle: "vr-brillen",
    parentSlug: "computer-gaming",
  },
  {
    slug: "gamecards-prepaid-karten",
    title: "Gamecards & Prepaid-Karten",
    description: "PlayStation, Xbox, Steam, Nintendo Guthaben.",
    shopifyHandle: "gamecards-prepaid-karten",
    parentSlug: "computer-gaming",
  },
  {
    slug: "spielsteuerungen",
    title: "Spielsteuerungen",
    description: "Lenkräder, Joysticks & Flight Controls.",
    shopifyHandle: "spielsteuerungen",
    parentSlug: "computer-gaming",
  },
  {
    slug: "gaming-stuehle",
    title: "Gaming Stühle",
    description: "Ergonomische Gaming Chairs für lange Sessions.",
    shopifyHandle: "gaming-stuehle",
    parentSlug: "computer-gaming",
  },

  /* --------------------------------------------------
     Subkategorie Gruppe 2: Notebooks
     -------------------------------------------------- */

  {
    slug: "notebooks",
    title: "Notebooks",
    description: "Laptops für Arbeit, Studium und Gaming.",
    shopifyHandle: "notebooks",
    parentSlug: "computer-gaming",
  },
  {
    slug: "notebook-akku",
    title: "Notebook Akku",
    description: "Ersatz-Akkus für Notebooks.",
    shopifyHandle: "notebook-akku",
    parentSlug: "computer-gaming",
  },
  {
    slug: "notebook-bildschirmfolie",
    title: "Notebook Bildschirmfolie",
    description: "Displayschutzfolien & Privatschutz.",
    shopifyHandle: "notebook-bildschirmfolie",
    parentSlug: "computer-gaming",
  },
  {
    slug: "notebook-dockingstation",
    title: "Notebook Dockingstation",
    description: "Dockingstations für mehr Anschlüsse.",
    shopifyHandle: "notebook-dockingstation",
    parentSlug: "computer-gaming",
  },
  {
    slug: "notebook-netzteil",
    title: "Notebook Netzteil",
    description: "Ersatz-Netzteile für alle Marken.",
    shopifyHandle: "notebook-netzteil",
    parentSlug: "computer-gaming",
  },
  {
    slug: "notebook-sicherheitsschloss",
    title: "Notebook Sicherheitsschloss",
    description: "Diebstahlsicherung für Laptops.",
    shopifyHandle: "notebook-sicherheitsschloss",
    parentSlug: "computer-gaming",
  },
  {
    slug: "notebook-zubehoer",
    title: "Notebook Zubehör",
    description: "Kabel, Adapter, Kühlung & Zubehör.",
    shopifyHandle: "notebook-zubehoer",
    parentSlug: "computer-gaming",
  },
  {
    slug: "taschen-huellen-notebooks",
    title: "Taschen & Hüllen Notebooks",
    description: "Schutzhüllen und Transporttaschen.",
    shopifyHandle: "taschen-huellen-notebooks",
    parentSlug: "computer-gaming",
  },

  /* --------------------------------------------------
     Subkategorie Gruppe 3: Software
     -------------------------------------------------- */

  {
    slug: "software",
    title: "Software",
    description: "Betriebssysteme, Office, Sicherheit & mehr.",
    shopifyHandle: "software",
    parentSlug: "computer-gaming",
  },

  /* --------------------------------------------------
     Subkategorie Gruppe 4: Drucker & Scanner
     -------------------------------------------------- */

  {
    slug: "drucker-scanner",
    title: "Drucker & Scanner",
    description: "Drucker, Scanner und Zubehör.",
    shopifyHandle: "drucker-scanner",
    parentSlug: "computer-gaming",
  },
  {
    slug: "3d-druckmaterial",
    title: "3D Druckmaterial",
    description: "Filamente & Zubehör für 3D-Druck.",
    shopifyHandle: "3d-druckmaterial",
    parentSlug: "computer-gaming",
  },
  {
    slug: "scanner-zubehoer",
    title: "Scanner Zubehör",
    shopifyHandle: "scanner-zubehoer",
    parentSlug: "computer-gaming",
  },
  {
    slug: "beschriftungsband",
    title: "Beschriftungsband",
    shopifyHandle: "beschriftungsband",
    parentSlug: "computer-gaming",
  },
  {
    slug: "etikettenrolle",
    title: "Etikettenrolle",
    shopifyHandle: "etikettenrolle",
    parentSlug: "computer-gaming",
  },
  {
    slug: "drucker-zubehoer",
    title: "Drucker Zubehör",
    shopifyHandle: "drucker-zubehoer",
    parentSlug: "computer-gaming",
  },
  {
    slug: "papierkassetten",
    title: "Papierkassetten",
    shopifyHandle: "papierkassetten",
    parentSlug: "computer-gaming",
  },
  {
    slug: "laserdrucker",
    title: "Laserdrucker",
    shopifyHandle: "laserdrucker",
    parentSlug: "computer-gaming",
  },
  {
    slug: "tintendrucker",
    title: "Tintendrucker",
    shopifyHandle: "tintendrucker",
    parentSlug: "computer-gaming",
  },
  {
    slug: "3d-drucker",
    title: "3D Drucker",
    shopifyHandle: "3d-drucker",
    parentSlug: "computer-gaming",
  },
  {
    slug: "etiketten-belegdrucker",
    title: "Etiketten- & Belegdrucker",
    shopifyHandle: "etiketten-belegdrucker",
    parentSlug: "computer-gaming",
  },
  {
    slug: "scanner",
    title: "Scanner",
    shopifyHandle: "scanner",
    parentSlug: "computer-gaming",
  },

  /* --------------------------------------------------
     Subkategorie Gruppe 5: Druckerpatronen & Toner
     -------------------------------------------------- */

  {
    slug: "druckerpatronen-toner",
    title: "Druckerpatronen & Toner",
    shopifyHandle: "druckerpatronen-toner",
    parentSlug: "computer-gaming",
  },
  {
    slug: "resttonerbehaelter",
    title: "Resttonerbehälter",
    shopifyHandle: "resttonerbehaelter",
    parentSlug: "computer-gaming",
  },
  {
    slug: "tintenpatronen",
    title: "Tintenpatronen",
    shopifyHandle: "tintenpatronen",
    parentSlug: "computer-gaming",
  },
  {
    slug: "toner-trommeln",
    title: "Toner & Trommeln",
    shopifyHandle: "toner-trommeln",
    parentSlug: "computer-gaming",
  },

  /* --------------------------------------------------
     Subkategorie Gruppe 6: Peripherie
     -------------------------------------------------- */

  {
    slug: "peripherie",
    title: "Peripherie",
    shopifyHandle: "peripherie",
    parentSlug: "computer-gaming",
  },
  {
    slug: "speicherkartenlesegeraete",
    title: "Speicherkartenlesegeräte",
    shopifyHandle: "speicherkartenlesegeraete",
    parentSlug: "computer-gaming",
  },
  {
    slug: "mausmatten",
    title: "Mausmatten",
    shopifyHandle: "mausmatten",
    parentSlug: "computer-gaming",
  },
  {
    slug: "handauflagen",
    title: "Handauflagen",
    shopifyHandle: "handauflagen",
    parentSlug: "computer-gaming",
  },
  {
    slug: "usb-hubs",
    title: "USB-Hubs",
    shopifyHandle: "usb-hubs",
    parentSlug: "computer-gaming",
  },
  {
    slug: "maeuse",
    title: "Mäuse",
    shopifyHandle: "maeuse",
    parentSlug: "computer-gaming",
  },
  {
    slug: "webcams",
    title: "Webcams",
    shopifyHandle: "webcams",
    parentSlug: "computer-gaming",
  },
  {
    slug: "pc-audio",
    title: "PC Audio",
    shopifyHandle: "pc-audio",
    parentSlug: "computer-gaming",
  },
  {
    slug: "tastaturen",
    title: "Tastaturen",
    shopifyHandle: "tastaturen",
    parentSlug: "computer-gaming",
  },
  {
    slug: "grafiktablets",
    title: "Grafiktablets",
    shopifyHandle: "grafiktablets",
    parentSlug: "computer-gaming",
  },

  /* --------------------------------------------------
     Subkategorie Gruppe 7: Speicher & Laufwerke
     -------------------------------------------------- */

  {
    slug: "speicher-laufwerke",
    title: "Speicher & Laufwerke",
    shopifyHandle: "speicher-laufwerke",
    parentSlug: "computer-gaming",
  },
  {
    slug: "festplatten-zubehoer",
    title: "Festplatten Zubehör",
    shopifyHandle: "festplatten-zubehoer",
    parentSlug: "computer-gaming",
  },
  {
    slug: "hdd-festplatten",
    title: "HDD Festplatten",
    shopifyHandle: "hdd-festplatten",
    parentSlug: "computer-gaming",
  },
  {
    slug: "ssd",
    title: "SSD",
    shopifyHandle: "ssd",
    parentSlug: "computer-gaming",
  },
  {
    slug: "usb-sticks",
    title: "USB Sticks",
    shopifyHandle: "usb-sticks",
    parentSlug: "computer-gaming",
  },
  {
    slug: "crypto-wallet",
    title: "Crypto Wallet",
    shopifyHandle: "crypto-wallet",
    parentSlug: "computer-gaming",
  },

  /* --------------------------------------------------
     Subkategorie Gruppe 8: Smart Home & Netzwerk
     -------------------------------------------------- */

  {
    slug: "smart-home-netzwerk",
    title: "Smart Home & Netzwerk",
    shopifyHandle: "smart-home-netzwerk",
    parentSlug: "computer-gaming",
  },
  {
    slug: "router-modem",
    title: "Router & Modem",
    shopifyHandle: "router-modem",
    parentSlug: "computer-gaming",
  },
  {
    slug: "switches",
    title: "Switches",
    shopifyHandle: "switches",
    parentSlug: "computer-gaming",
  },
  {
    slug: "access-point-repeater",
    title: "Access Point & Repeater",
    shopifyHandle: "access-point-repeater",
    parentSlug: "computer-gaming",
  },
  {
    slug: "powerline",
    title: "Powerline",
    shopifyHandle: "powerline",
    parentSlug: "computer-gaming",
  },

  /* --------------------------------------------------
     Subkategorie Gruppe 9: PC Komponenten
     -------------------------------------------------- */

  {
    slug: "pc-komponenten",
    title: "PC Komponenten",
    shopifyHandle: "pc-komponenten",
    parentSlug: "computer-gaming",
  },
  {
    slug: "prozessoren",
    title: "Prozessoren",
    shopifyHandle: "prozessoren",
    parentSlug: "computer-gaming",
  },
  {
    slug: "arbeitsspeicher",
    title: "Arbeitsspeicher",
    shopifyHandle: "arbeitsspeicher",
    parentSlug: "computer-gaming",
  },
  {
    slug: "mainboards",
    title: "Mainboards",
    shopifyHandle: "mainboards",
    parentSlug: "computer-gaming",
  },
  {
    slug: "grafikkarten",
    title: "Grafikkarten",
    shopifyHandle: "grafikkarten",
    parentSlug: "computer-gaming",
  },
  {
    slug: "gehaeuse",
    title: "Gehäuse",
    shopifyHandle: "gehaeuse",
    parentSlug: "computer-gaming",
  },
  {
    slug: "cpu-kuehlung",
    title: "CPU Kühlung",
    shopifyHandle: "cpu-kuehlung",
    parentSlug: "computer-gaming",
  },
  {
    slug: "netzteile",
    title: "Netzteile",
    shopifyHandle: "netzteile",
    parentSlug: "computer-gaming",
  },

  /* --------------------------------------------------
     Subkategorie Gruppe 10: PCs & Monitore
     -------------------------------------------------- */

  {
    slug: "pcs-monitore",
    title: "PCs & Monitore",
    shopifyHandle: "pcs-monitore",
    parentSlug: "computer-gaming",
  },
  {
    slug: "tower-desktop-pcs",
    title: "Tower & Desktop PCs",
    shopifyHandle: "tower-desktop-pcs",
    parentSlug: "computer-gaming",
  },
  {
    slug: "monitore",
    title: "Monitore",
    shopifyHandle: "monitore",
    parentSlug: "computer-gaming",
  },
  {
    slug: "monitor-zubehoer",
    title: "Monitor Zubehör",
    shopifyHandle: "monitor-zubehoer",
    parentSlug: "computer-gaming",
  },

  /* --------------------------------------------------
     Subkategorie Gruppe 11: Kabel & Adapter
     -------------------------------------------------- */

  {
    slug: "computer-kabel-adapter",
    title: "Computer Kabel & Adapter",
    shopifyHandle: "computer-kabel-adapter",
    parentSlug: "computer-gaming",
  },
];

/* --------------------------------------------------
   Helper para obter categoria por slug
   -------------------------------------------------- */

export function getCategoryBySlug(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug);
}

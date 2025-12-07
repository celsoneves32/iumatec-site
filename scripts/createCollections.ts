// scripts/createCollections.ts
// Script para criar todas as Collections no Shopify via Admin API
// Corre com:  npm run create:collections

import "dotenv/config";

type CollectionDef = {
  handle: string;
  title: string;
  bodyHtml?: string;
};

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN; // ex.: iumatec-2.myshopify.com
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const API_VERSION = process.env.SHOPIFY_ADMIN_API_VERSION || "2024-04";

if (!STORE_DOMAIN || !ADMIN_TOKEN) {
  throw new Error(
    "SHOPIFY_STORE_DOMAIN ou SHOPIFY_ADMIN_ACCESS_TOKEN em falta no .env.local"
  );
}

const ADMIN_API_URL = `https://${STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`;

// 👉 LISTA DE TODAS AS COLLECTIONS A CRIAR (handles mais descritivos)
const collections: CollectionDef[] = [
  // ---------------- TOP-LEVEL / SORTIMENT ----------------
  {
    handle: "computer-gaming",
    title: "Computer & Gaming",
    bodyHtml:
      "Alles für Gaming, Arbeiten und Entertainment – von Notebooks über Konsolen bis zu PC-Komponenten.",
  },
  {
    handle: "telefonie-tablet-und-smartwatch",
    title: "Telefonie, Tablet & Smartwatch",
    bodyHtml:
      "Smartphones, Tablets, Smartwatches und Zubehör für deinen Alltag.",
  },
  {
    handle: "tv-und-audio",
    title: "TV & Audio",
    bodyHtml:
      "Fernseher, Soundbars und Heimkino-Systeme mit brillanter Bild- und Tonqualität.",
  },
  {
    handle: "haushalt-und-kueche",
    title: "Haushalt & Küche",
    bodyHtml: "Haushaltsgeräte und Küchenhelfer für ein modernes Zuhause.",
  },
  {
    handle: "garten-und-grill",
    title: "Garten & Grill",
    bodyHtml: "Gartenpflege, Grills und Outdoor-Zubehör für jede Saison.",
  },
  {
    handle: "foto-und-video",
    title: "Foto & Video",
    bodyHtml:
      "Kameras, Objektive, Drohnen und Zubehör für professionelle Aufnahmen.",
  },
  {
    handle: "zubehoer-und-kabel",
    title: "Zubehör & Kabel",
    bodyHtml:
      "Adapter, Ladegeräte, Kabel und essentielles Zubehör für alle Geräte.",
  },
  {
    handle: "aktionen",
    title: "Aktionen",
    bodyHtml: "Top-Angebote und Technik-Deals – nur für kurze Zeit.",
  },

  // ---------------- COLUNA 1 – GAMING ----------------
  {
    handle: "gaming",
    title: "Gaming",
    bodyHtml: "Alles fürs Gaming – Zubehör, Geräte und vieles mehr.",
  },
  {
    handle: "spielkonsolen",
    title: "Spielkonsolen",
    bodyHtml: "PlayStation, Xbox, Nintendo & mehr.",
  },
  {
    handle: "spielkonsolen-games",
    title: "Spielkonsolen Games",
    bodyHtml: "Games für PS5, Xbox, Nintendo Switch.",
  },
  {
    handle: "spielkonsolen-und-zubehoer",
    title: "Spielkonsolen Zubehör",
    bodyHtml: "Controller, Cases, Ladegeräte & Add-ons.",
  },
  {
    handle: "pc-games",
    title: "PC Games",
    bodyHtml: "Spiele für Windows PC & Mac.",
  },
  {
    handle: "vr-brillen",
    title: "VR-Brillen",
    bodyHtml: "Virtuelle Realität – Headsets & Zubehör.",
  },
  {
    handle: "gamecards-und-prepaid-karten",
    title: "Gamecards & Prepaid-Karten",
    bodyHtml: "Guthaben für PSN, Xbox, Nintendo, Steam.",
  },
  {
    handle: "spielsteuerungen",
    title: "Spielsteuerungen",
    bodyHtml: "Lenkräder, Joysticks, Flight Controls.",
  },
  {
    handle: "gaming-stuehle",
    title: "Gaming Stühle",
    bodyHtml: "Ergonomische Stühle für lange Sessions.",
  },

  // ---------------- COLUNA 2 – NOTEBOOKS ----------------
  {
    handle: "notebooks",
    title: "Notebooks",
    bodyHtml: "Laptops für Arbeit, Studium & Freizeit.",
  },
  {
    handle: "notebook-akkus",
    title: "Notebook Akku",
    bodyHtml: "Ersatz-Akkus für alle Modelle.",
  },
  {
    handle: "notebook-bildschirm-und-schutzfolien",
    title: "Notebook Bildschirmfolie",
    bodyHtml: "Displayschutz & Sichtschutzfolien für Notebooks.",
  },
  {
    handle: "notebook-dockingstationen",
    title: "Notebook Dockingstation",
    bodyHtml: "Mehr Anschlüsse für dein Notebook.",
  },
  {
    handle: "notebook-netzteile",
    title: "Notebook Netzteil",
    bodyHtml: "Original und kompatible Netzteile.",
  },
  {
    handle: "notebook-sicherheitsschloesser",
    title: "Notebook Sicherheitsschloss",
    bodyHtml: "Diebstahlschutz für Laptops.",
  },
  {
    handle: "notebook-zubehoer",
    title: "Notebook Zubehör",
    bodyHtml: "Kabel, Adapter, Kühlung & mehr.",
  },
  {
    handle: "notebook-taschen-und-huellen",
    title: "Taschen & Hüllen Notebooks",
    bodyHtml: "Schutzhüllen und Transporttaschen für Notebooks.",
  },

  // ---------------- COLUNA 3 – DRUCKER & PERIPHERIE ----------------
  {
    handle: "drucker-und-scanner",
    title: "Drucker & Scanner",
    bodyHtml: "Laserdrucker, Tintendrucker, Scanner & mehr.",
  },
  {
    handle: "3d-drucker",
    title: "3D Drucker",
    bodyHtml: "3D-Drucker für Einsteiger & Profis.",
  },
  {
    handle: "3d-druckmaterial-und-filamente",
    title: "3D Druckmaterial",
    bodyHtml: "Filamente & Zubehör für 3D-Druck.",
  },
  {
    handle: "tintendrucker",
    title: "Tintendrucker",
    bodyHtml: "Tintendrucker und Zubehör.",
  },
  {
    handle: "laserdrucker",
    title: "Laserdrucker",
    bodyHtml: "Laserdrucker für Zuhause und Büro.",
  },
  {
    handle: "scanner",
    title: "Scanner",
    bodyHtml: "Scanner und Zubehör.",
  },
  {
    handle: "druckerpatronen-und-toner",
    title: "Druckerpatronen & Toner",
    bodyHtml: "Tinte, Toner und Verbrauchsmaterial.",
  },
  {
    handle: "tintenpatronen",
    title: "Tintenpatronen",
    bodyHtml: "Tintenpatronen für alle Marken.",
  },
  {
    handle: "toner-und-trommeln",
    title: "Toner & Trommeln",
    bodyHtml: "Toner und Bildtrommeln.",
  },
  {
    handle: "pc-peripherie",
    title: "Peripherie",
    bodyHtml: "PC-Peripherie für jeden Einsatz.",
  },
  {
    handle: "pc-maeuse",
    title: "Mäuse",
    bodyHtml: "Computer-Mäuse für Gaming oder Arbeit.",
  },
  {
    handle: "pc-tastaturen",
    title: "Tastaturen",
    bodyHtml: "Mechanische und klassische Tastaturen.",
  },
  {
    handle: "webcams",
    title: "Webcams",
    bodyHtml: "Webcams für Meetings & Streaming.",
  },
  {
    handle: "pc-audio-und-headsets",
    title: "PC Audio",
    bodyHtml: "Lautsprecher, Headsets & Soundkarten.",
  },
  {
    handle: "grafiktablets-und-zeichentablets",
    title: "Grafiktablets",
    bodyHtml: "Zeichentablets für kreative Arbeit.",
  },

  // ---------------- COLUNA 4 – SPEICHER, KOMPONENTEN, PCs, KABEL ----------------
  {
    handle: "speicher-und-laufwerke",
    title: "Speicher & Laufwerke",
    bodyHtml: "SSD, HDD, USB-Sticks und mehr.",
  },
  {
    handle: "ssd-festplatten",
    title: "SSD",
    bodyHtml: "Solid State Drives für schnellen Speicher.",
  },
  {
    handle: "hdd-festplatten",
    title: "HDD Festplatten",
    bodyHtml: "Klassische Festplatten zur Datenspeicherung.",
  },
  {
    handle: "usb-sticks-und-speichersticks",
    title: "USB Sticks",
    bodyHtml: "USB-Sticks in allen Grössen.",
  },
  {
    handle: "hardware-und-crypto-wallets",
    title: "Crypto Wallet",
    bodyHtml: "Wallets für sichere Kryptowährung-Aufbewahrung.",
  },
  {
    handle: "pc-komponenten",
    title: "PC Komponenten",
    bodyHtml: "Alle wichtigen Teile für PC-Builds.",
  },
  {
    handle: "pc-prozessoren",
    title: "Prozessoren",
    bodyHtml: "CPUs für Desktop & Workstations.",
  },
  {
    handle: "arbeitsspeicher-ram",
    title: "Arbeitsspeicher",
    bodyHtml: "RAM für bessere Performance.",
  },
  {
    handle: "grafikkarten-gpu",
    title: "Grafikkarten",
    bodyHtml: "GPUs für Gaming und Workloads.",
  },
  {
    handle: "pc-gehaeuse",
    title: "Gehäuse",
    bodyHtml: "PC-Gehäuse in allen Formfaktoren.",
  },
  {
    handle: "pc-netzteile",
    title: "Netzteile",
    bodyHtml: "PSUs für stabile Stromversorgung.",
  },
  {
    handle: "pcs-und-monitore",
    title: "PCs & Monitore",
    bodyHtml: "Fertige PCs und Monitore.",
  },
  {
    handle: "tower-und-desktop-pcs",
    title: "Tower & Desktop PCs",
    bodyHtml: "Leistungsstarke Desktop-Systeme.",
  },
  {
    handle: "pc-monitore",
    title: "Monitore",
    bodyHtml: "Monitore für Gaming und Arbeit.",
  },
  {
    handle: "monitor-zubehoer-und-halterungen",
    title: "Monitor Zubehör",
    bodyHtml: "Halterungen, Kabel & mehr.",
  },
  {
    handle: "computer-kabel-und-adapter",
    title: "Computer Kabel & Adapter",
    bodyHtml: "Essentielle Kabel und Adapter.",
  },
];

async function shopifyAdminFetch<T>(
  query: string,
  variables?: Record<string, any>
): Promise<T> {
  const res = await fetch(ADMIN_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": ADMIN_TOKEN!,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();
  if (!res.ok || json.errors) {
    console.error("Shopify Admin Fehler:", json.errors || json);
    throw new Error("Shopify Admin Anfrage fehlgeschlagen");
  }
  return json.data;
}

async function collectionExists(handle: string): Promise<boolean> {
  const query = `
    query CollectionsByHandle($query: String!) {
      collections(first: 1, query: $query) {
        edges {
          node {
            id
            handle
          }
        }
      }
    }
  `;

  const data = await shopifyAdminFetch<{
    collections: { edges: { node: { id: string; handle: string } }[] };
  }>(query, { query: `handle:${handle}` });

  return data.collections.edges.length > 0;
}

async function createCollection(col: CollectionDef): Promise<void> {
  const mutation = `
    mutation CreateCollection($input: CollectionInput!) {
      collectionCreate(input: $input) {
        collection {
          id
          handle
          title
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const input: any = {
    handle: col.handle,
    title: col.title,
  };

  if (col.bodyHtml) {
    input.descriptionHtml = col.bodyHtml;
  }

  const data = await shopifyAdminFetch<{
    collectionCreate: {
      collection: { id: string; handle: string; title: string } | null;
      userErrors: { field: string[]; message: string }[];
    };
  }>(mutation, { input });

  const { collectionCreate } = data;

  if (collectionCreate.userErrors.length > 0) {
    console.error(
      `❌ Fehler beim Erstellen der Collection "${col.handle}":`,
      collectionCreate.userErrors
    );
    return;
  }

  console.log(
    `✅ Collection erstellt: ${collectionCreate.collection?.title} (${collectionCreate.collection?.handle})`
  );
}

async function main() {
  console.log("🚀 Starte Erstellung der Collections...");

  for (const col of collections) {
    try {
      const exists = await collectionExists(col.handle);
      if (exists) {
        console.log(`ℹ️  Collection existiert bereits: ${col.handle}, überspringe.`);
        continue;
      }

      await createCollection(col);
      // kleine Pause für die Rate Limits
      await new Promise((r) => setTimeout(r, 300));
    } catch (err) {
      console.error(`❌ Fehler bei Collection ${col.handle}:`, err);
    }
  }

  console.log("✅ Fertig! Alle Collections wurden geprüft/erstellt.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

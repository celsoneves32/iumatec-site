import Link from "next/link";
import Image from "next/image";
import { getCollections } from "@/lib/shopify";

export const metadata = {
  title: "Kategorien",
};

type CollectionItem = {
  id: string;
  handle: string;
  title: string;
  description?: string;
  image?: {
    url: string;
    altText?: string | null;
  } | null;
};

function CategoryIcon({ handle }: { handle: string }) {
  const iconClass = "h-12 w-12 text-neutral-400 dark:text-neutral-500";

  switch (handle) {
    case "computer":
    case "computers":
    case "desktop-pcs":
    case "mini-pcs":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={iconClass}>
          <rect x="3" y="4" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 20h8M10 16v4M14 16v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case "laptops":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={iconClass}>
          <rect x="5" y="5" width="14" height="10" rx="1.8" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3 17h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M8 19h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case "pc-komponenten":
    case "komponenten":
    case "components":
    case "grafikkarten":
    case "gpus":
    case "arbeitsspeicher-ram":
    case "ram":
    case "mainboards":
    case "motherboards":
    case "netzteile":
    case "power-supplies":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={iconClass}>
          <rect x="6" y="6" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case "tastaturen":
    case "keyboards":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={iconClass}>
          <rect x="3" y="7" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6 10h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M6 13h8M16 13h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );

    case "monitors":
    case "monitor":
    case "monitore":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={iconClass}>
          <rect x="4" y="5" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 19h4M12 15v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case "mause":
    case "mäuse":
    case "mice":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={iconClass}>
          <rect x="8" y="3" width="8" height="18" rx="4" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 7V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case "headsets":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={iconClass}>
          <path d="M5 13a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="1.5" />
          <rect x="4" y="12" width="3" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <rect x="17" y="12" width="3" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M17 18a3 3 0 0 1-3 3h-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case "webcams":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={iconClass}>
          <rect x="4" y="7" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M14 10l5-2v8l-5-2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <circle cx="9" cy="12" r="2.2" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );

    case "gaming-stuhle":
    case "gaming-stühle":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={iconClass}>
          <path d="M7 8c0-2 1.5-4 5-4s5 2 5 4v4c0 2-1 4-3 5v3h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M10 20h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M9 10h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case "docking-stations":
    case "dockingstationen":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={iconClass}>
          <rect x="4" y="10" width="16" height="5" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 8v2M12 7v3M16 8v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case "netzwerk":
    case "router":
    case "routers":
    case "netzwerk-switches":
    case "switches":
    case "wi-fi-mesh":
    case "wifi-mesh":
    case "wlan-mesh":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={iconClass}>
          <rect x="4" y="11" width="16" height="6" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 8a6 6 0 0 1 8 0M10 6a3.5 3.5 0 0 1 4 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="14" r="0.8" fill="currentColor" />
          <circle cx="12" cy="14" r="0.8" fill="currentColor" />
          <circle cx="16" cy="14" r="0.8" fill="currentColor" />
        </svg>
      );

    case "smartphones":
    case "tablets":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={iconClass}>
          <rect x="7" y="3" width="10" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M11 6h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="12" cy="17.5" r="0.7" fill="currentColor" />
        </svg>
      );

    case "zubehor":
    case "zubehör":
    case "accessories":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={iconClass}>
          <rect x="5" y="7" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M9 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );

    case "office":
    case "office-business":
    case "printers":
    case "drucker":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={iconClass}>
          <rect x="6" y="4" width="12" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <rect x="4" y="10" width="16" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 17h8v3H8z" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );

    case "datenspeicher":
    case "speicher":
    case "storage":
    case "external-ssd":
    case "externe-ssd":
    case "nas":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={iconClass}>
          <rect x="6" y="4" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M9 8h6M9 12h6M9 16h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case "smart-home":
    case "kameras":
    case "cameras":
    case "smart-plugs":
    case "smarte-steckdosen":
    case "smart-lighting":
    case "smarte-beleuchtung":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={iconClass}>
          <path d="M12 3a5 5 0 0 1 5 5c0 2-1.1 3.2-2 4.2-.8.9-1.5 1.7-1.5 2.8h-3c0-1.1-.7-1.9-1.5-2.8C8.1 11.2 7 10 7 8a5 5 0 0 1 5-5Z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 18h4M10.5 21h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={iconClass}>
          <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
  }
}

function CategoryCard({ collection }: { collection: CollectionItem }) {
  return (
    <Link
      href={`/collections/${collection.handle}`}
      className="group overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative flex aspect-[16/10] items-center justify-center bg-neutral-100 dark:bg-neutral-800">
        {collection.image?.url ? (
          <Image
            src={collection.image.url}
            alt={collection.image.altText || collection.title}
            fill
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <CategoryIcon handle={collection.handle} />
        )}
      </div>

      <div className="p-5">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          {collection.title}
        </h3>

        {collection.description ? (
          <p className="mt-2 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
            {collection.description}
          </p>
        ) : (
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Kategorie ansehen
          </p>
        )}
      </div>
    </Link>
  );
}

function CategorySection({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle?: string;
  items: CollectionItem[];
}) {
  if (!items.length) return null;

  return (
    <section className="mb-12">
      <div className="mb-5">
        <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {subtitle}
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((collection) => (
          <CategoryCard key={collection.id} collection={collection} />
        ))}
      </div>
    </section>
  );
}

export default async function CollectionsPage() {
  const rawCollections = await getCollections(50);
  const collections = rawCollections as CollectionItem[];

  const groupedHandles = {
    computer: ["computer", "computers", "laptops", "desktop-pcs", "mini-pcs"],
    pcComponents: [
      "pc-komponenten",
      "komponenten",
      "components",
      "grafikkarten",
      "gpus",
      "arbeitsspeicher-ram",
      "ram",
      "mainboards",
      "motherboards",
      "netzteile",
      "power-supplies",
    ],
    peripherie: [
      "tastaturen",
      "keyboards",
      "monitors",
      "monitor",
      "monitore",
      "mause",
      "mäuse",
      "mice",
      "headsets",
      "webcams",
      "gaming-stuhle",
      "gaming-stühle",
      "docking-stations",
      "dockingstationen",
    ],
    netzwerk: [
      "netzwerk",
      "router",
      "routers",
      "netzwerk-switches",
      "switches",
      "wi-fi-mesh",
      "wifi-mesh",
      "wlan-mesh",
    ],
    mobile: ["smartphones", "tablets", "zubehor", "zubehör", "accessories"],
    officeBusiness: ["office", "office-business", "drucker", "printers"],
    datenspeicher: [
      "datenspeicher",
      "speicher",
      "storage",
      "external-ssd",
      "externe-ssd",
      "nas",
    ],
    smartHome: [
      "smart-home",
      "kameras",
      "cameras",
      "smart-plugs",
      "smarte-steckdosen",
      "smart-lighting",
      "smarte-beleuchtung",
    ],
  };

  const getByHandles = (handles: string[]) =>
    collections.filter((collection) => handles.includes(collection.handle));

  const usedHandles = new Set(Object.values(groupedHandles).flat());

  const computerItems = getByHandles(groupedHandles.computer);
  const pcComponentsItems = getByHandles(groupedHandles.pcComponents);
  const peripherieItems = getByHandles(groupedHandles.peripherie);
  const netzwerkItems = getByHandles(groupedHandles.netzwerk);
  const mobileItems = getByHandles(groupedHandles.mobile);
  const officeBusinessItems = getByHandles(groupedHandles.officeBusiness);
  const datenspeicherItems = getByHandles(groupedHandles.datenspeicher);
  const smartHomeItems = getByHandles(groupedHandles.smartHome);

  const otherItems = collections.filter(
    (collection) => !usedHandles.has(collection.handle)
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 text-neutral-900 dark:text-neutral-100">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Kategorien</h1>
        <p className="mt-2 max-w-2xl text-neutral-600 dark:text-neutral-400">
          Entdecke unsere Hauptkategorien und finde schnell die passenden Produkte
          für dein Setup, dein Büro oder deinen Alltag.
        </p>
      </div>

      <CategorySection
        title="Computer"
        subtitle="Laptops, Desktop-PCs und Mini-PCs."
        items={computerItems}
      />

      <CategorySection
        title="PC-Komponenten"
        subtitle="Leistungsstarke Hardware für Aufrüstung und Individualaufbau."
        items={pcComponentsItems}
      />

      <CategorySection
        title="Peripherie"
        subtitle="Monitore, Eingabegeräte, Webcams, Headsets und Zubehör."
        items={peripherieItems}
      />

      <CategorySection
        title="Netzwerk"
        subtitle="Router, Switches und Mesh-Lösungen für stabile Verbindungen."
        items={netzwerkItems}
      />

      <CategorySection
        title="Mobile"
        subtitle="Smartphones, Tablets und passendes Zubehör."
        items={mobileItems}
      />

      <CategorySection
        title="Office & Business"
        subtitle="Drucklösungen und Technik für produktives Arbeiten im Büro."
        items={officeBusinessItems}
      />

      <CategorySection
        title="Datenspeicher"
        subtitle="Externe SSDs, NAS und Speicherlösungen."
        items={datenspeicherItems}
      />

      <CategorySection
        title="Smart Home"
        subtitle="Smarte Geräte für Sicherheit, Komfort und Beleuchtung."
        items={smartHomeItems}
      />

      <CategorySection
        title="Weitere Kategorien"
        subtitle="Zusätzliche Kategorien aus unserem Sortiment."
        items={otherItems}
      />
    </main>
  );
}

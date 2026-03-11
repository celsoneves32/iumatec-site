import Link from "next/link";
import Image from "next/image";
import { getCollections } from "@/lib/shopify";

export const metadata = {
  title: "Kategorien",
};

function CategoryIcon({ handle }: { handle: string }) {
  const iconClass = "h-14 w-14 text-neutral-400 dark:text-neutral-500";

  switch (handle) {
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

    case "components":
    case "motherboards":
    case "gpus":
    case "ram":
    case "power-supplies":
    case "ssd-hdd":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={iconClass}>
          <rect x="6" y="6" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case "monitors":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={iconClass}>
          <rect x="4" y="5" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 19h4M12 15v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case "keyboards":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={iconClass}>
          <rect x="3" y="7" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6 10h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M6 13h8M16 13h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );

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

    case "gaming":
    case "gaming-chairs":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={iconClass}>
          <path d="M7 8c0-2 1.5-4 5-4s5 2 5 4v4c0 2-1 4-3 5v3h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M10 20h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M9 10h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case "networking":
    case "routers":
    case "switches":
    case "wi-fi-mesh":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={iconClass}>
          <rect x="4" y="11" width="16" height="6" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 8a6 6 0 0 1 8 0M10 6a3.5 3.5 0 0 1 4 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="14" r="0.8" fill="currentColor" />
          <circle cx="12" cy="14" r="0.8" fill="currentColor" />
          <circle cx="16" cy="14" r="0.8" fill="currentColor" />
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

export default async function CollectionsPage() {
  const collections = await getCollections(30);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 text-neutral-900 dark:text-neutral-100">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Kategorien</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          Entdecke unsere Hauptkategorien.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((collection) => (
          <Link
            key={collection.id}
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
              <h2 className="text-lg font-semibold">{collection.title}</h2>

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
        ))}
      </div>
    </main>
  );
}

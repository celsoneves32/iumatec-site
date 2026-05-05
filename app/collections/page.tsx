import Image from "next/image";
import Link from "next/link";

const collections = [
  {
    title: "Laptops",
    href: "/produkte?category=Computer&subcategory=Laptops",
    image: "/categories/laptops.png",
    description: "Für Arbeit, Business und Alltag",
  },
  {
    title: "Desktop-PCs",
    href: "/produkte?category=Computer&subcategory=Desktop-PCs",
    image: "/categories/desktop-pcs.png",
    description: "Leistung für Office und Power-User",
  },
  {
    title: "Grafikkarten",
    href: "/produkte?category=PC-Komponenten&subcategory=Grafikkarten",
    image: "/categories/gpus.png",
    description: "Gaming, AI und Workstation",
  },
  {
    title: "Smartphones",
    href: "/produkte?category=Mobile&subcategory=Smartphones",
    image: "/categories/smartphones.png",
    description: "Neueste Modelle und Zubehör",
  },
  {
    title: "Monitore",
    href: "/produkte?category=Peripherie&subcategory=Monitors",
    image: "/categories/monitors.png",
    description: "Für Office, Content und Gaming",
  },
  {
    title: "Tastaturen",
    href: "/produkte?category=Peripherie&subcategory=Tastaturen",
    image: "/categories/keyboards.png",
    description: "Mechanisch, Office und Wireless",
  },
  {
    title: "Router",
    href: "/produkte?category=Netzwerk&subcategory=Router",
    image: "/categories/routers.png",
    description: "Stabiles WLAN für Zuhause und Büro",
  },
  {
    title: "Drucker",
    href: "/produkte?category=Office%20%26%20Business&subcategory=Drucker",
    image: "/categories/printers.png",
    description: "Laser, Inkjet und Business-Lösungen",
  },
];

export default function CollectionsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-950">
          Kategorien
        </h1>
        <p className="mt-2 text-neutral-600">
          Entdecke unsere wichtigsten Produktkategorien.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {collections.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-3xl border border-neutral-200 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="relative mb-5 h-28 w-full overflow-hidden rounded-2xl bg-neutral-50">
              <Image
                src={item.image}
                alt={item.title}
                fill
                className="object-contain p-4"
                sizes="280px"
              />
            </div>

            <div className="text-2xl font-semibold text-neutral-900 transition group-hover:text-brand">
              {item.title}
            </div>

            <div className="mt-2 text-sm text-neutral-600">
              {item.description}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
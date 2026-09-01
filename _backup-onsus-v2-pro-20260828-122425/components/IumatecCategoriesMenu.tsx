import Link from "next/link";

const categories = [
  {
    title: "Computer",
    items: [
      { label: "Laptops", href: "/produkte?category=Computer&subcategory=Laptops" },
      { label: "Desktop-PCs", href: "/produkte?category=Computer&subcategory=Desktop-PCs" },
      { label: "Mini PCs", href: "/produkte?category=Computer&subcategory=Mini PCs" },
    ],
  },
  {
    title: "Peripherie",
    items: [
      { label: "Monitore", href: "/produkte?category=Peripherie&subcategory=Monitors" },
      { label: "Tastaturen", href: "/produkte?category=Peripherie&subcategory=Tastaturen" },
      { label: "Mäuse", href: "/produkte?category=Peripherie&subcategory=Mäuse" },
    ],
  },
  {
    title: "Mobile",
    items: [
      { label: "Smartphones", href: "/produkte?category=Mobile&subcategory=Smartphones" },
      { label: "Tablets", href: "/produkte?category=Mobile&subcategory=Tablets" },
      { label: "Zubehör", href: "/produkte?category=Mobile&subcategory=Zubehör" },
    ],
  },
  {
    title: "Netzwerk",
    items: [
      { label: "Router", href: "/produkte?category=Netzwerk&subcategory=Router" },
      { label: "Switches", href: "/produkte?category=Netzwerk&subcategory=Netzwerk-Switches" },
      { label: "WLAN Mesh", href: "/produkte?category=Netzwerk&subcategory=WLAN Mesh" },
    ],
  },
];

export default function IumatecCategoriesMenu() {
  return (
    <nav className="grid gap-8 md:grid-cols-4">
      {categories.map((section) => (
        <div key={section.title}>
          <h3 className="mb-3 text-sm font-extrabold text-neutral-950">
            {section.title}
          </h3>

          <div className="space-y-2">
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block text-sm font-medium text-neutral-600 hover:text-red-600"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
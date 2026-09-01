import Link from "next/link";

const categories = [
  {
    title: "Computer",
    href: "/produkte?category=Computer",
    items: [
      { label: "Laptops", href: "/produkte?category=Computer&subcategory=Laptops" },
      { label: "Desktop-PCs", href: "/produkte?category=Computer&subcategory=Desktop-PCs" },
      { label: "Mini PCs", href: "/produkte?category=Computer&subcategory=Mini%20PCs" },
    ],
  },
  {
    title: "PC-Komponenten",
    href: "/produkte?category=PC-Komponenten",
    items: [
      { label: "Grafikkarten", href: "/produkte?category=PC-Komponenten&subcategory=Grafikkarten" },
      { label: "RAM", href: "/produkte?category=PC-Komponenten&subcategory=Arbeitsspeicher" },
      { label: "Mainboards", href: "/produkte?category=PC-Komponenten&subcategory=Mainboards" },
      { label: "Netzteile", href: "/produkte?category=PC-Komponenten&subcategory=Netzteile" },
      { label: "Prozessoren", href: "/produkte?category=PC-Komponenten&q=Prozessor" },
    ],
  },
  {
    title: "Peripherie",
    href: "/produkte?category=Peripherie",
    items: [
      { label: "Monitore", href: "/produkte?category=Peripherie&q=Monitor" },
      { label: "Tastaturen", href: "/produkte?category=Peripherie&subcategory=Tastaturen" },
      { label: "Mäuse", href: "/produkte?category=Peripherie&subcategory=M%C3%A4use" },
      { label: "Headsets", href: "/produkte?category=Peripherie&subcategory=Headsets" },
      { label: "Webcams", href: "/produkte?category=Peripherie&subcategory=Webcams" },
      { label: "Dockingstationen", href: "/produkte?category=Peripherie&q=Docking" },
      { label: "Gaming-Stühle", href: "/produkte?category=Peripherie&q=Gaming%20Stuhl" },
    ],
  },
  {
    title: "Netzwerk",
    href: "/produkte?category=Netzwerk",
    items: [
      { label: "Router", href: "/produkte?category=Netzwerk&subcategory=Router" },
      { label: "Switches", href: "/produkte?category=Netzwerk&q=Switch" },
      { label: "WLAN Mesh", href: "/produkte?category=Netzwerk&q=Mesh" },
    ],
  },
  {
    title: "Mobile",
    href: "/produkte?category=Mobile",
    items: [
      { label: "Smartphones", href: "/produkte?category=Mobile&subcategory=Smartphones" },
      { label: "Tablets", href: "/produkte?category=Mobile&subcategory=Tablets" },
      { label: "Zubehör", href: "/produkte?category=Mobile&q=Zubeh%C3%B6r" },
    ],
  },
  {
    title: "Office & Business",
    href: "/produkte?q=Drucker",
    items: [
      { label: "Drucker", href: "/produkte?q=Drucker" },
      { label: "Tinte & Toner", href: "/produkte?q=Toner" },
      { label: "Papier & Etiketten", href: "/produkte?q=Etiketten" },
    ],
  },
  {
    title: "Datenspeicher",
    href: "/produkte?category=Datenspeicher",
    items: [
      { label: "SSD", href: "/produkte?category=Datenspeicher&q=SSD" },
      { label: "HDD", href: "/produkte?category=Datenspeicher&q=HDD" },
      { label: "NAS", href: "/produkte?category=Datenspeicher&subcategory=NAS" },
      { label: "Externe SSD", href: "/produkte?category=Datenspeicher&q=Externe%20SSD" },
    ],
  },
  {
    title: "Smart Home",
    href: "/produkte?category=Smart%20Home",
    items: [
      { label: "Kameras", href: "/produkte?category=Smart%20Home&subcategory=Kameras" },
      { label: "Steckdosen", href: "/produkte?category=Smart%20Home&q=Steckdose" },
      { label: "Beleuchtung", href: "/produkte?category=Smart%20Home&q=Beleuchtung" },
    ],
  },
];

export default function IumatecCategoriesMenu() {
  return (
    <nav className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
      {categories.map((section) => (
        <div key={section.title}>
          <Link
            href={section.href}
            className="mb-3 inline-block text-sm font-extrabold text-neutral-950 hover:text-red-600"
          >
            {section.title}
          </Link>
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

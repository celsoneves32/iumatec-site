// data/products.ts

export type Product = {
  id: string;
  title: string;
  price: number;
  image: string;
  description: string;
  category: string;
  badge?: "Bestseller" | "Aktion" | "Neu";
};

// 🔹 Mock-Produkte mit IMAGENS TEMPORÁRIAS (via.placeholder.com)
export const PRODUCTS: Product[] = [
  {
    id: "p1",
    title: 'Samsung 65" 4K QLED',
    price: 899,
    image: "https://via.placeholder.com/600x400?text=65%22+4K+TV",
    description:
      "Brillantes 4K-QLED-Display – perfekt für Filme, Sport und Gaming.",
    category: "TV & Audio",
    badge: "Bestseller",
  },
  {
    id: "p2",
    title: "iPhone 15 128GB",
    price: 799,
    image: "https://via.placeholder.com/600x400?text=iPhone+15",
    description:
      "Das neue iPhone 15 mit starkem Chip und 48 MP Kamera.",
    category: "Smartphones",
    badge: "Neu",
  },
  {
    id: "p3",
    title: "Gaming Laptop RTX 4060",
    price: 1299,
    image: "https://via.placeholder.com/600x400?text=Gaming+Laptop",
    description:
      "Leistungsstarker Laptop für Gaming und Arbeit mit RTX 4060.",
    category: "Informatik",
    badge: "Aktion",
  },
  {
    id: "p4",
    title: "PlayStation 5 Bundle",
    price: 599,
    image: "https://via.placeholder.com/600x400?text=PlayStation+5",
    description:
      "Konsole der neuen Generation – inkl. Controller und Spiel.",
    category: "Gaming",
  },
  {
    id: "p5",
    title: "Bluetooth Soundbar",
    price: 199,
    image: "https://via.placeholder.com/600x400?text=Soundbar",
    description:
      "Kompakte Soundbar für besseren TV-Sound und Musik.",
    category: "TV & Audio",
  },
  {
    id: "p6",
    title: 'Office Laptop 15"',
    price: 649,
    image: "https://via.placeholder.com/600x400?text=Office+Laptop",
    description:
      "Zuverlässiger Laptop für Office, E-Mails und Homeoffice.",
    category: "Informatik",
  },

  // ⭐ NOVO PRODUTO DE TESTE POR CHF 1.– ⭐
  {
    id: "test1",
    title: "Testprodukt – Nur CHF 1.–",
    price: 1,
    image: "https://via.placeholder.com/600x400?text=Testprodukt+CHF+1",
    description:
      "Dies ist ein Testprodukt. Nur zum Testen des Bestellprozesses.",
    category: "Test",
    badge: "Aktion",
  },
];

export function getProductByI

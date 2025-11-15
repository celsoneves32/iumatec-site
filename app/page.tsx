import Image from "next/image";
import Link from "next/link";
import PromoBanner from "@/components/PromoBanner"; // ✅ continua a vir de /components
import NewsletterSignup from "./components/NewsletterSignup"; // ✅ agora vem de app/components

export const metadata = {
  title: "IUMATEC – Technik zu unschlagbaren Preisen",
  description:
    "Smartphones, TV & Audio, Informatik, Gaming – schnelle Lieferung in der ganzen Schweiz.",
};

type Card = { href: string; title: string; subtitle: string; emoji: string };

const CATEGORIES: Card[] = [
  {
    href: "/produkte?cat=Smartphones",
    title: "Smartphones",
    subtitle: "Apple • Samsung u.v.m.",
    emoji: "📱",
  },
  {
    href: "/produkte?cat=TV & Audio",
    title: "TV & Audio",
    subtitle: "OLED • Sound • Kino",
    emoji: "📺",
  },
  {
    href: "/produkte?cat=Informatik",
    title: "Informatik",
    subtitle: "Laptops • Zubehör",
    emoji: "💻",
  },
  {
    href: "/produkte?cat=Gaming",
    title: "Gaming",
    subtitle: "Konsolen • Zubehör",
    emoji: "🎮",
  },
];

const BESTSELLER = [
  {
    id: "p1",
    title: "iPhone 15 128GB",
    price: 799,
    image: "/products/iphone15.png",
    href: "/produkte/p1",
    badge: "Bestseller",
  },
  {
    id: "p3",
    title: "LG OLED C3 55” 4K",
    price: 1199,
    image: "/products/lg-oled-c3.png",
    href: "/produkte/p3",
    badge: "Aktion",
  },
  {
    id: "p5",
    title: "MacBook Air M2 13”",
    price: 1099,
    image: "/products/macbook-air-m2.png",
    href: "/produkte/p5",
  },
  {
    id: "p7",
    title: "PlayStation 5 Slim",
    price: 499,
    image: "/products/ps5-slim.png",
    href: "/produkte/p7",
  },
];

export default function Home() {
  return (
    <main className="max-w-7xl mx-auto px-4 pb-12">
      {/* PROMO BANNER */}
      <PromoBanner
        title="Black Friday: bis zu 30% Rabatt auf ausgewählte Produkte"
        subtitle="Nur bis Sonntag – solange Vorrat reicht."
        href="/produkte?sort=relevanz"
        ctaLabel="Deals ansehen"
        variant="red"
        startAt="2025-11-01T00:00:00Z"
        endAt="2025-11-30T23:59:59Z"
        sto

"use client";

import Link from "next/link";

const CATEGORIES = [
  {
    title: "Computer",
    href: "/produkte?category=Computer",
    image: "/images/categories/computer.png",
  },
  {
    title: "PC-Komponenten",
    href: "/produkte?category=PC-Komponenten",
    image: "/images/categories/pc-komponenten.png",
  },
  {
    title: "Peripherie",
    href: "/produkte?category=Peripherie",
    image: "/images/categories/peripherie.png",
  },
  {
    title: "Mobile",
    href: "/produkte?category=Mobile&subcategory=Smartphones",
    image: "/images/categories/mobile.png",
  },
  {
    title: "Netzwerk",
    href: "/produkte?category=Netzwerk",
    image: "/images/categories/netzwerk.png",
  },
  {
    title: "Datenspeicher",
    href: "/produkte?category=Datenspeicher",
    image: "/images/categories/datenspeicher.png",
  },
  {
    title: "Office & Business",
    href: "/produkte?category=Office%20%26%20Business",
    image: "/images/categories/office-business.png",
  },
  {
    title: "Smart Home",
    href: "/produkte?category=Smart%20Home",
    image: "/images/categories/smart-home.png",
  },
];

export default function HomeCategoryGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {CATEGORIES.map((category) => (
        <Link
          key={category.title}
          href={category.href}
          aria-label={`${category.title} entdecken`}
          className="group relative block h-[315px] overflow-hidden rounded-[22px] border border-neutral-200 bg-white shadow-[0_8px_25px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(15,23,42,0.10)]"
        >
          <img
            src={category.image}
            alt={`${category.title} bei IUMATEC`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-[1.015]"
          />
        </Link>
      ))}
    </div>
  );
}
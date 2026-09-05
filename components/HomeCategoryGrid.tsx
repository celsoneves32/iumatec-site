"use client";

import Link from "next/link";
import {
  Cpu,
  HardDrive,
  House,
  Laptop,
  Monitor,
  Printer,
  Smartphone,
  Wifi,
  type LucideIcon,
} from "lucide-react";

type CategoryItem = {
  title: string;
  subtitle: string;
  href: string;
  image: string;
  icon: LucideIcon;
  accent: "red" | "black";
  imagePosition: string;
  imageSize: string;
};

const CATEGORIES: CategoryItem[] = [
  {
    title: "Computer",
    subtitle: "Laptops, Desktop-PCs und Mini PCs",
    href: "/produkte?category=Computer",
    image: "/images/categories/computer.png",
    icon: Laptop,
    accent: "red",
    imagePosition: "100% 100%",
    imageSize: "160%",
  },

  {
    title: "PC-Komponenten",
    subtitle: "Komponenten, Kabel, Gaming und mehr",
    href: "/produkte?category=PC-Komponenten",
    image: "/images/categories/pc-komponenten.png",
    icon: Cpu,
    accent: "black",
    imagePosition: "100% 100%",
    imageSize: "150%",
  },

  {
    title: "Peripherie",
    subtitle: "Monitore, Eingabegeräte und Zubehör",
    href: "/produkte?category=Peripherie",
    image: "/images/categories/peripherie.png",
    icon: Monitor,
    accent: "black",
    imagePosition: "100% 100%",
    imageSize: "155%",
  },

  {
    title: "Mobile",
    subtitle: "Smartphones, Tablets und Zubehör",
    href: "/produkte?category=Mobile&subcategory=Smartphones",
    image: "/images/categories/mobile.png",
    icon: Smartphone,
    accent: "red",
    imagePosition: "100% 100%",
    imageSize: "155%",
  },

  {
    title: "Netzwerk",
    subtitle: "Router, Switches und Netzwerktechnik",
    href: "/produkte?category=Netzwerk",
    image: "/images/categories/netzwerk.png",
    icon: Wifi,
    accent: "black",
    imagePosition: "100% 100%",
    imageSize: "150%",
  },

  {
    title: "Datenspeicher",
    subtitle: "SSD, HDD, NAS und externe Speicher",
    href: "/produkte?category=Datenspeicher",
    image: "/images/categories/datenspeicher.png",
    icon: HardDrive,
    accent: "red",
    imagePosition: "100% 100%",
    imageSize: "150%",
  },

  {
    title: "Office & Business",
    subtitle: "Drucker, Verbrauchsmaterial und Büro-Technik",
    href: "/produkte?category=Office%20%26%20Business",
    image: "/images/categories/office-business.png",
    icon: Printer,
    accent: "black",
    imagePosition: "100% 100%",
    imageSize: "155%",
  },

  {
    title: "Smart Home",
    subtitle: "Sicherheit, Beleuchtung und Gebäudetechnik",
    href: "/produkte?category=Smart%20Home",
    image: "/images/categories/smart-home.png",
    icon: House,
    accent: "black",
    imagePosition: "100% 100%",
    imageSize: "150%",
  },
];

export default function HomeCategoryGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {CATEGORIES.map((item) => {
        const Icon = item.icon;
        const red = item.accent === "red";

        return (
          <Link
            key={item.title}
            href={item.href}
            aria-label={`${item.title} entdecken`}
            className="
              group
              relative
              block
              h-[245px]
              overflow-hidden
              rounded-[22px]
              border
              border-neutral-200
              bg-white
              shadow-[0_8px_26px_rgba(15,23,42,0.045)]
              transition
              duration-300
              hover:-translate-y-0.5
              hover:border-neutral-300
              hover:shadow-[0_18px_48px_rgba(15,23,42,0.09)]
            "
          >
            {/* linha superior */}
            <div
              className={`absolute inset-x-0 top-0 z-20 h-[3px] ${
                red ? "bg-red-600" : "bg-neutral-950"
              }`}
            />

            {/* decoração */}
            <div className="pointer-events-none absolute -right-16 -top-14 h-52 w-52 rounded-full bg-neutral-50" />

            <div className="pointer-events-none absolute -bottom-24 -right-10 h-56 w-56 rounded-full border border-red-200/50" />

            {/* conteúdo */}
            <div className="relative z-20 flex h-full flex-col p-5">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                  red
                    ? "bg-red-50 text-red-600"
                    : "bg-neutral-100 text-neutral-900"
                }`}
              >
                <Icon size={20} strokeWidth={1.8} />
              </div>

              <div className="mt-4 w-[59%]">
                <h3 className="text-[18px] font-black leading-tight tracking-[-0.02em] text-neutral-950">
                  {item.title}
                </h3>

                <p className="mt-2 min-h-[42px] text-[12px] leading-[1.7] text-neutral-500">
                  {item.subtitle}
                </p>
              </div>

              <div className="mt-auto inline-flex items-center gap-2 text-[12px] font-black text-neutral-950">
                Entdecken

                <span className="text-red-600 transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </div>
            </div>

            {/* produto recortado da arte */}
            <div className="pointer-events-none absolute bottom-0 right-0 z-10 h-[88%] w-[46%] overflow-hidden">
              <div
                className="
                  absolute
                  inset-0
                  bg-no-repeat
                  transition
                  duration-500
                  group-hover:scale-[1.025]
                "
                style={{
                  backgroundImage: `url("${item.image}")`,
                  backgroundPosition: item.imagePosition,
                  backgroundSize: item.imageSize,
                }}
              />
            </div>

            {/* transição suave entre texto e produto */}
            <div className="pointer-events-none absolute inset-y-0 left-[50%] z-[15] w-14 bg-gradient-to-r from-white via-white/90 to-transparent" />
          </Link>
        );
      })}
    </div>
  );
}
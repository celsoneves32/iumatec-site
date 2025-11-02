"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/", label: "Startseite" },
  { href: "/produkte", label: "Produkte" },
  { href: "/kontakt", label: "Kontakt" },
  { href: "/impressum", label: "Impressum" },
];

export default function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-white/80 backdrop-blur dark:bg-neutral-900/80 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" aria-label="IUMATEC Startseite">
          <img src="/logo-iumatec.svg" alt="IUMATEC" className="h-8" />
        </Link>

        <nav className="flex space-x-6 text-sm font-medium text-gray-700 dark:text-gray-200">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`hover:underline ${
                pathname === href ? "text-red-600" : ""
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

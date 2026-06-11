import "./globals.css";
import type { Metadata } from "next";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { CompareProvider } from "@/context/CompareContext";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CartDrawer from "@/components/CartDrawer";
import CompareBar from "@/components/CompareBar";

export const metadata: Metadata = {
  metadataBase: new URL("https://iumatec.ch"),
  title: {
    default: "IUMATEC Schweiz",
    template: "%s | IUMATEC Schweiz",
  },
  description:
    "IUMATEC Schweiz – Technik, schnell und sicher. Produkte, Zubehör und starke Preise für die Schweiz.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className="bg-white text-neutral-900">
        <CompareProvider>
          <WishlistProvider>
            <CartProvider>
              <SiteHeader />
              {children}
              <SiteFooter />
              <CartDrawer />
              <CompareBar />
            </CartProvider>
          </WishlistProvider>
        </CompareProvider>
      </body>
    </html>
  );
}
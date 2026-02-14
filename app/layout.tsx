import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import SiteHeader from "@/components/SiteHeader";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de-CH">
      <body>
        <FavoritesProvider>
          <CartProvider>
            <SiteHeader />
            {children}
          </CartProvider>
        </FavoritesProvider>
      </body>
    </html>
  );
}

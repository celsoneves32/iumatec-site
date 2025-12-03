import "./globals.css";
import SessionProviderWrapper from "@/components/SessionProviderWrapper"; 
import CartProvider from "@/context/CartContext";
import FavoritesProvider from "@/context/FavoritesContext";

export const metadata = {
  title: "IUMATEC",
  description: "Technik zu unschlagbaren Preisen",
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>
        <SessionProviderWrapper>
          <CartProvider>
            <FavoritesProvider>
              {children}
            </FavoritesProvider>
          </CartProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}

// app/layout.tsx
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import SiteHeader from "@/components/SiteHeader";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de-CH">
      <body>
        <CartProvider>
          <SiteHeader />
          {children}
        </CartProvider>
      </body>
    </html>
  );
}

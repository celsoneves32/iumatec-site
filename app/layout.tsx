import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import "./globals.css"; // mantém se tiveres estilos globais

export const metadata: Metadata = {
  title: "IUMATEC – Technik zu unschlagbaren Preisen",
  description:
    "Smartphones, TV & Audio, Informatik, Gaming – schnelle Lieferung in der ganzen Schweiz.",
  icons: {
    icon: "/favicon.ico",
    other: [
      { rel: "icon", url: "/favicon.svg", type: "image/svg+xml" }, // opcional (SVG moderno)
      { rel: "apple-touch-icon", url: "/apple-touch-icon.png" }, // para iOS
    ],
  },
  manifest: "/site.webmanifest",
  metadataBase: new URL("https://iumatec.ch"),
  openGraph: {
    title: "IUMATEC – Technik zu unschlagbaren Preisen",
    description:
      "Smartphones, TV & Audio, Informatik, Gaming – schnelle Lieferung in der ganzen Schweiz.",
    url: "https://iumatec.ch",
    siteName: "IUMATEC Schweiz",
    locale: "de_CH",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body
        style={{
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        }}
      >
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}

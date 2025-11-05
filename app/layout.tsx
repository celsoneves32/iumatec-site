import type { Metadata } from "next";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import FooterBarMobile from "../components/FooterBarMobile";
import "./globals.css";

export const metadata: Metadata = {
  title: "IUMATEC – Technik zu unschlagbaren Preisen",
  description:
    "Smartphones, TV & Audio, Informatik, Gaming – schnelle Lieferung in der ganzen Schweiz.",
  icons: {
    icon: "/favicon.ico",
    other: [
      { rel: "icon", url: "/favicon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", url: "/apple-touch-icon.png" }
    ]
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
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "IUMATEC – Technik zu unschlagbaren Preisen",
    description:
      "Technik und Elektronikprodukte mit schneller Lieferung in der ganzen Schweiz.",
    site: "@iumatec"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body
        className="font-sans antialiased bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
        style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" }}
      >
        <SiteHeader />
        {children}
        <SiteFooter />
        <FooterBarMobile />
      </body>
    </html>
  );
}

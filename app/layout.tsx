// app/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://iumatec.ch"),
  title: {
    default: "IUMATEC – Elektronik & Zubehör",
    template: "%s | IUMATEC",
  },
  description: "Elektronik, Zubehör und Technik-Produkte – schnell in der Schweiz geliefert.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "https://iumatec.ch",
    siteName: "IUMATEC",
    title: "IUMATEC – Elektronik & Zubehör",
    description: "Elektronik, Zubehör und Technik-Produkte – schnell in der Schweiz geliefert.",
  },
  twitter: {
    card: "summary_large_image",
    title: "IUMATEC – Elektronik & Zubehör",
    description: "Elektronik, Zubehör und Technik-Produkte – schnell in der Schweiz geliefert.",
  },
};

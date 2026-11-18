import type { Metadata } from "next";
import KontoOrdersClient from "@/components/KontoOrdersClient";

export const metadata: Metadata = {
  title: "Meine Bestellungen | IUMATEC Schweiz",
  description: "Bestellungen, Lieferstatus, Rechnungen und Zahlungen im geschützten IUMATEC Kundenkonto.",
  robots: { index: false, follow: false },
};
export default function MeineBestellungenPage() {
  return <KontoOrdersClient />;
}

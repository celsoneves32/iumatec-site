import CategoryLandingPage from "@/components/CategoryLandingPage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function MonitorsPage() {
  return (
    <CategoryLandingPage
      title="Monitore kaufen"
      subtitle="Monitore für Arbeit, Gaming und produktive Setups mit direkter Verfügbarkeit."
      category="Peripherie"
      subcategory="Monitors"
      badge="Peripherie · Monitors"
    />
  );
}
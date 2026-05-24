import CategoryLandingPage from "@/components/CategoryLandingPage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function GrafikkartenPage() {
  return (
    <CategoryLandingPage
      title="Grafikkarten kaufen"
      subtitle="Grafikkarten für Gaming, Workstations und professionelle Performance."
      category="PC-Komponenten"
      subcategory="Grafikkarten"
      badge="PC-Komponenten · Grafikkarten"
    />
  );
}
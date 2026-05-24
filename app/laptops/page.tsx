import CategoryLandingPage from "@/components/CategoryLandingPage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function LaptopsPage() {
  return (
    <CategoryLandingPage
      title="Laptops kaufen"
      subtitle="Business, Homeoffice und Performance-Laptops direkt bei IUMATEC Schweiz kaufen."
      category="Computer"
      subcategory="Laptops"
      badge="Computer · Laptops"
    />
  );
}
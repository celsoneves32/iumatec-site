import CategoryLandingPage from "@/components/CategoryLandingPage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function SmartphonesPage() {
  return (
    <CategoryLandingPage
      title="Smartphones kaufen"
      subtitle="Aktuelle Smartphones mit transparenten Preisen und sicherem Checkout."
      category="Mobile"
      subcategory="Smartphones"
      badge="Mobile · Smartphones"
    />
  );
}
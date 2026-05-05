import Link from "next/link";
import { getIumatecCategories } from "@/lib/iumatec";

export default function IumatecCategoriesMenu() {
  const categories = getIumatecCategories();

  return (
    <div className="grid grid-cols-4 gap-x-8 gap-y-8">
      {categories.map((category) => (
        <div key={category.name}>
          <div className="mb-3">
            <Link
              href={`/produkte?category=${encodeURIComponent(category.name)}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-900 hover:text-brand"
            >
              <span>{category.name}</span>
            </Link>
          </div>

          <ul className="space-y-2">
            {category.subcategories.slice(0, 10).map((sub) => (
              <li key={sub}>
                <Link
                  href={`/produkte?category=${encodeURIComponent(
                    category.name
                  )}&subcategory=${encodeURIComponent(sub)}`}
                  className="text-sm text-neutral-600 hover:text-brand transition"
                >
                  {sub}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
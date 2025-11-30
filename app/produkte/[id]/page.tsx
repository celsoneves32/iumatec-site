// app/produkte/[id]/page.tsx
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import AddToCartButton from "@/components/AddToCartButton";
import AddToFavoritesButton from "@/components/AddToFavoritesButton";
import { getProductById, PRODUCTS } from "@/data/products";

type PageProps = {
  params: { id: string };
};

export async function generateMetadata({ params }: PageProps) {
  const product = getProductById(params.id);

  if (!product) {
    return {
      title: "Produkt nicht gefunden | IUMATEC",
    };
  }

  return {
    title: `${product.title} | IUMATEC Schweiz`,
    description: product.description,
  };
}

export default function ProductDetailPage({ params }: PageProps) {
  const product = getProductById(params.id);

  if (!product) {
    notFound();
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-4 text-xs text-neutral-500">
        <Link href="/produkte" className="hover:underline">
          Produkte
        </Link>{" "}
        / <span>{product!.title}</span>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Imagem grande */}
        <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-neutral-200 bg-white">
          <Image
            src={product!.image}
            alt={product!.title}
            width={900}
            height={600}
            className="w-full h-full object-cover"
          />
          {product!.badge && (
            <span className="absolute left-4 top-4 rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white shadow">
              {product!.badge}
            </span>
          )}
        </div>

        {/* Infos */}
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-neutral-500">
              {product!.category}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              {product!.title}
            </h1>
          </div>

          <p className="text-sm text-neutral-700">
            {product!.description}
          </p>

          <div className="flex items-center gap-4 mt-2">
            <p className="text-2xl font-semibold text-neutral-900">
              CHF {product!.price.toFixed(2)}
            </p>
            <p className="text-xs text-green-600 font-medium">
              Sofort lieferbar
            </p>
          </div>

          {/* Botões: Carrinho + Favoritos */}
          <div className="mt-2 flex flex-col sm:flex-row gap-3 max-w-md">
            <div className="flex-1">
              <AddToCartButton
                id={product!.id}
                title={product!.title}
                price={product!.price}
              />
            </div>
            <AddToFavoritesButton productId={product!.id} />
          </div>

          <div className="mt-4 rounded-2xl border border-neutral-200 p-4 bg-neutral-50 text-xs text-neutral-600">
            <p className="font-semibold mb-1">Lieferung & Abholung</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Versand in der ganzen Schweiz</li>
              <li>Lieferzeit in der Regel 1–3 Werktage</li>
              <li>Rechnung per E-Mail</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Mais produtos em baixo */}
      <section className="mt-10 border-t border-neutral-200 pt-6">
        <h2 className="text-sm font-semibold mb-4">
          Weitere Produkte entdecken
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PRODUCTS.filter((p) => p.id !== product!.id)
            .slice(0, 4)
            .map((p) => (
              <Link
                key={p.id}
                href={`/produkte/${p.id}`}
                className="group rounded-xl border border-neutral-200 bg-white p-3 flex flex-col gap-2 hover:shadow-sm transition-shadow"
              >
                <div className="relative w-full aspect-[4/3] overflow-hidden rounded-lg">
                  <Image
                    src={p.image}
                    alt={p.title}
                    width={400}
                    height={300}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform"
                  />
                </div>
                <p className="text-[11px] uppercase tracking-wide text-neutral-500">
                  {p.category}
                </p>
                <p className="text-xs font-semibold line-clamp-2 group-hover:text-red-600">
                  {p.title}
                </p>
                <p className="text-sm font-semibold">
                  CHF {p.price.toFixed(2)}
                </p>
              </Link>
            ))}
        </div>
      </section>
    </main>
  );
}

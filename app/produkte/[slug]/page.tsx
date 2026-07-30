import Link from "next/link";
import { notFound } from "next/navigation";

import ProductGallery from "@/components/ProductGallery";
import ProductBuyBox from "@/components/product/ProductBuyBox";
import ProductTrust from "@/components/product/ProductTrust";
import ProductSpecs from "@/components/product/ProductSpecs";
import RelatedCarousel from "@/components/product/RelatedCarousel";

import {
  getProductBySlug,
  getProductVariants,
  getRelatedProducts,
  type Product,
} from "@/lib/productData";

type Props = {
  params: {
    slug: string;
  };
};

function formatPrice(price: number) {
  const safePrice = Number.isFinite(Number(price)) ? Number(price) : 0;
  const roundedPrice = safePrice.toFixed(2);
  const [francs, cents] = roundedPrice.split(".");

  return `CHF ${francs.replace(/\B(?=(\d{3})+(?!\d))/g, "'")}.${cents}`;
}

function getProductSlug(product: Product) {
  const productData = product as any;

  return String(
    productData.slug ||
      productData.shopifyProductHandle ||
      productData.productHandle ||
      "",
  ).trim();
}

function getMerchandiseId(product: Product) {
  const productData = product as any;

  return (
    productData.merchandiseId ||
    productData.shopifyVariantId ||
    null
  );
}

function getStockQty(product: Product) {
  const productData = product as any;

  return Number(productData.stockQty ?? productData.stock ?? 0);
}

function getProductImages(product: Product) {
  const images = [
    product.image,
    ...(Array.isArray(product.images) ? product.images : []),
  ]
    .filter((image): image is string => Boolean(image?.trim()))
    .filter((image) => image.startsWith("http"));

  return Array.from(new Set(images));
}

function getVariantLabel(product: Product) {
  const productData = product as any;

  const text = `${productData.title || ""} ${
    productData.description || ""
  } ${productData.description2 || ""}`;

  const color =
    text.match(
      /(Midnight|Mitternacht|Sky Blue|Silber|Silver|Schwarz|Black|Grau|Gray|Grey|Blue|Blau|Gold|Starlight|Space Schwarz|Space Black)/i,
    )?.[0] || null;

  const storage =
    text.match(/(64GB|128GB|256GB|512GB|1TB|2TB|4TB)/i)?.[0] ||
    null;

  const ram =
    text.match(
      /(8 GB|16 GB|24 GB|32 GB|64 GB|128 GB|8GB|16GB|24GB|32GB|64GB|128GB)/i,
    )?.[0] || null;

  const parts = [color, storage, ram]
    .filter(Boolean)
    .map((value) =>
      String(value).replace(/(\d+)(GB)/i, "$1 GB"),
    );

  return parts.length
    ? parts.join(" · ")
    : String(productData.title || "Variante");
}

export default function ProductPage({ params }: Props) {
  const product = getProductBySlug(params.slug);

  if (!product) {
    return notFound();
  }

  const productData = product as any;
  const currentSlug = getProductSlug(product);
  const productImages = getProductImages(product);

  const stockQty = getStockQty(product);
  const inStock = stockQty > 0 || Boolean(product.inStock);
  const price = Number(productData.price || 0);

  const variantProducts = getProductVariants(product);

  const relatedProducts = getRelatedProducts(
    currentSlug,
    product.category,
    product.subcategory,
    8,
  );

  return (
    <main className="bg-white">
      <section className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-2 text-sm text-neutral-500"
          >
            <Link
              href="/"
              className="transition hover:text-neutral-950"
            >
              Startseite
            </Link>

            <span>/</span>

            <Link
              href="/produkte"
              className="transition hover:text-neutral-950"
            >
              Produkte
            </Link>

            {product.category ? (
              <>
                <span>/</span>

                <Link
                  href={`/produkte?category=${encodeURIComponent(
                    product.category,
                  )}`}
                  className="transition hover:text-neutral-950"
                >
                  {product.category}
                </Link>
              </>
            ) : null}

            <span>/</span>

            <span className="max-w-[280px] truncate font-semibold text-neutral-800">
              {product.title}
            </span>
          </nav>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 lg:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
          <div>
            <ProductGallery
              title={product.title}
              images={productImages}
            />

            {variantProducts.length > 1 ? (
              <div className="mt-6 rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="mb-4">
                  <p className="text-sm font-black uppercase tracking-widest text-red-600">
                    Varianten
                  </p>

                  <h2 className="mt-1 text-xl font-black text-neutral-950">
                    Andere Ausführungen
                  </h2>
                </div>

                <div className="flex flex-wrap gap-3">
                  {variantProducts.map((variantProduct) => {
                    const variantSlug =
                      getProductSlug(variantProduct);

                    const isActive =
                      variantSlug === currentSlug;

                    return (
                      <Link
                        key={variantSlug}
                        href={`/produkte/${variantSlug}`}
                        className={
                          isActive
                            ? "rounded-2xl border-2 border-red-600 bg-red-50 px-4 py-3 text-sm font-black text-red-700"
                            : "rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm font-bold text-neutral-800 transition hover:border-neutral-950 hover:bg-neutral-50"
                        }
                      >
                        {getVariantLabel(variantProduct)}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="mt-6 rounded-[2rem] border border-neutral-200 bg-neutral-50 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-neutral-500">
                    Artikelnummer
                  </p>

                  <p className="mt-1 text-sm font-bold text-neutral-950">
                    {productData.internalNumber ||
                      product.sku ||
                      "Nicht angegeben"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-neutral-500">
                    EAN
                  </p>

                  <p className="mt-1 break-all text-sm font-bold text-neutral-950">
                    {productData.ean || "Nicht angegeben"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <ProductBuyBox
            title={product.title}
            brand={product.brand}
            price={formatPrice(price)}
            stockQty={stockQty}
            inStock={inStock}
            merchandiseId={getMerchandiseId(product)}
            productHandle={
              productData.shopifyProductHandle ||
              productData.productHandle ||
              currentSlug
            }
            imageUrl={product.image ?? null}
          />
        </div>
      </section>

      <ProductTrust />

      <ProductSpecs
        brand={product.brand}
        sku={product.sku}
        internalNumber={productData.internalNumber}
        ean={productData.ean}
        stockQty={stockQty}
        deliveryDate={productData.deliveryDate}
        warrantyMonths={productData.warrantyMonths}
        weight={productData.weight}
        category={product.category}
        subcategory={product.subcategory}
        description={product.description}
        description2={product.description2}
      />

      <RelatedCarousel products={relatedProducts} />
    </main>
  );
}

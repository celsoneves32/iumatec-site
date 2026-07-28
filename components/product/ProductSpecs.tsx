import {
  parseProductSpecifications,
  type ProductSpecification,
} from "@/lib/productSpecifications";

type ProductSpecsProps = {
  brand?: string | null;
  sku?: string | null;
  internalNumber?: string | null;
  ean?: string | null;
  stockQty?: number;
  deliveryDate?: string | null;
  warrantyMonths?: number | null;
  weight?: number | null;
  category?: string | null;
  subcategory?: string | null;
  description?: string | null;
  description2?: string | null;
};

type SpecRow = {
  label: string;
  value: string;
};

function hasValue(value: unknown) {
  return String(value ?? "").trim().length > 0;
}

function formatWeight(weight?: number | null) {
  const numericWeight = Number(weight || 0);

  if (!Number.isFinite(numericWeight) || numericWeight <= 0) {
    return "";
  }

  return `${numericWeight} kg`;
}

function formatWarranty(warrantyMonths?: number | null) {
  const months = Number(warrantyMonths || 0);

  if (!Number.isFinite(months) || months <= 0) {
    return "";
  }

  if (months === 12) {
    return "12 Monate";
  }

  if (months === 24) {
    return "24 Monate";
  }

  return `${months} Monate`;
}

function removeDuplicateSpecs(
  specifications: ProductSpecification[],
  generalRows: SpecRow[],
) {
  const generalLabels = new Set(
    generalRows.map((row) => row.label.toLowerCase()),
  );

  return specifications.filter(
    (specification) =>
      !generalLabels.has(specification.label.toLowerCase()),
  );
}

export default function ProductSpecs({
  brand,
  sku,
  internalNumber,
  ean,
  stockQty = 0,
  deliveryDate,
  warrantyMonths,
  weight,
  category,
  subcategory,
  description,
  description2,
}: ProductSpecsProps) {
  const generalRows: SpecRow[] = [
    {
      label: "Hersteller",
      value: brand || "",
    },
    {
      label: "Artikelnummer",
      value: internalNumber || sku || "",
    },
    {
      label: "SKU",
      value: sku || "",
    },
    {
      label: "EAN",
      value: ean || "",
    },
    {
      label: "Kategorie",
      value: category || "",
    },
    {
      label: "Unterkategorie",
      value: subcategory || "",
    },
    {
      label: "Lagerbestand",
      value: stockQty > 0 ? `${stockQty} Stück` : "Nicht verfügbar",
    },
    {
      label: "Lieferung",
      value: deliveryDate || "1–3 Werktage",
    },
    {
      label: "Garantie",
      value: formatWarranty(warrantyMonths),
    },
    {
      label: "Gewicht",
      value: formatWeight(weight),
    },
  ].filter((row) => hasValue(row.value));

  const parsedSpecifications = parseProductSpecifications(description2);

  const technicalSpecifications = removeDuplicateSpecs(
    parsedSpecifications,
    generalRows,
  );

  const commercialDescription =
    description && description !== description2
      ? description
      : null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-14">
      <div className="mb-10">
        <p className="text-sm font-black uppercase tracking-widest text-red-600">
          Produktinformationen
        </p>

        <h2 className="mt-2 text-3xl font-black tracking-tight text-neutral-950">
          Details und technische Daten
        </h2>
      </div>

      {commercialDescription ? (
        <div className="mb-10 rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-black text-neutral-950">
            Beschreibung
          </h3>

          <p className="mt-4 whitespace-pre-line text-sm leading-7 text-neutral-700">
            {commercialDescription}
          </p>
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="text-xl font-black text-neutral-950">
            Allgemeine Angaben
          </h3>

          <div className="mt-5 overflow-hidden rounded-[2rem] border border-neutral-200 bg-white shadow-sm">
            <dl>
              {generalRows.map((row, index) => (
                <div
                  key={row.label}
                  className={`grid gap-2 px-5 py-4 sm:grid-cols-[180px_1fr] ${
                    index !== generalRows.length - 1
                      ? "border-b border-neutral-200"
                      : ""
                  }`}
                >
                  <dt className="text-sm font-black text-neutral-700">
                    {row.label}
                  </dt>

                  <dd className="break-words text-sm text-neutral-600">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-black text-neutral-950">
            Technische Spezifikationen
          </h3>

          {technicalSpecifications.length > 0 ? (
            <div className="mt-5 overflow-hidden rounded-[2rem] border border-neutral-200 bg-white shadow-sm">
              <dl>
                {technicalSpecifications.map(
                  (specification, index) => (
                    <div
                      key={`${specification.label}-${index}`}
                      className={`grid gap-2 px-5 py-4 sm:grid-cols-[180px_1fr] ${
                        index !== technicalSpecifications.length - 1
                          ? "border-b border-neutral-200"
                          : ""
                      }`}
                    >
                      <dt className="text-sm font-black text-neutral-700">
                        {specification.label}
                      </dt>

                      <dd className="break-words text-sm text-neutral-600">
                        {specification.value}
                      </dd>
                    </div>
                  ),
                )}
              </dl>
            </div>
          ) : (
            <div className="mt-5 rounded-[2rem] border border-dashed border-neutral-300 bg-neutral-50 p-6">
              <p className="text-sm leading-6 text-neutral-500">
                Für dieses Produkt sind aktuell keine zusätzlichen technischen
                Spezifikationen verfügbar.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
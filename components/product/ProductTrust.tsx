type TrustItem = {
  icon: string;
  title: string;
  description: string;
};

const trustItems: TrustItem[] = [
  {
    icon: "🇨🇭",
    title: "Schweizer Onlineshop",
    description: "Klare Preise in CHF und MWST inklusive.",
  },
  {
    icon: "🚚",
    title: "Schnelle Lieferung",
    description: "Versand innerhalb der Schweiz bei Lagerbestand.",
  },
  {
    icon: "🔒",
    title: "Sicher bezahlen",
    description: "Geschützter Checkout über Shopify.",
  },
  {
    icon: "✅",
    title: "Originalprodukte",
    description: "Ware von offiziellen Marken und Distributoren.",
  },
];

export default function ProductTrust() {
  return (
    <section className="border-y border-neutral-200 bg-neutral-50">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trustItems.map((item) => (
            <div
              key={item.title}
              className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-neutral-100 text-2xl">
                  {item.icon}
                </div>

                <div>
                  <h3 className="font-black text-neutral-950">
                    {item.title}
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-neutral-500">
                    {item.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
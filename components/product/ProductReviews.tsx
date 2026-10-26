import { getProductReviews } from "@/lib/reviews";

type Props = {
  productSlug: string;
};

function stars(value: number) {
  const safe = Math.max(0, Math.min(5, Math.round(value)));

  return (
    "\u2605".repeat(safe) +
    "\u2606".repeat(5 - safe)
  );
}

function formatDate(value: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export default async function ProductReviews({
  productSlug,
}: Props) {
  const reviews = await getProductReviews(productSlug);

  const total = reviews.length;

  const average =
    total > 0
      ? reviews.reduce(
          (sum, review) => sum + Number(review.rating || 0),
          0,
        ) / total
      : 0;

  const distribution = [5, 4, 3, 2, 1].map((rating) => {
    const count = reviews.filter(
      (review) => Number(review.rating) === rating,
    ).length;

    return {
      rating,
      count,
      percentage:
        total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });

  return (
    <section
      id="bewertungen"
      className="border-t border-neutral-200 bg-neutral-50"
    >
      <div className="mx-auto max-w-7xl px-4 py-14 lg:py-20">
        <div className="mb-10">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-red-600">
            Kundenbewertungen
          </p>

          <h2 className="mt-2 text-3xl font-black tracking-tight text-neutral-950 md:text-4xl">
            Bewertungen
          </h2>

          <p className="mt-3 max-w-2xl text-neutral-600">
            Erfahrungen von Kunden, die bei IUMATEC eingekauft
            haben.
          </p>
        </div>

        {total === 0 ? (
          <div className="rounded-[2rem] border border-neutral-200 bg-white p-8 text-center shadow-sm md:p-12">
            <div className="text-3xl tracking-wider text-amber-400">
              {stars(5)}
            </div>

            <h3 className="mt-4 text-2xl font-black text-neutral-950">
              Noch keine Bewertungen
            </h3>

            <p className="mx-auto mt-3 max-w-xl text-neutral-600">
              Sobald ein verifizierter Kunde dieses Produkt
              bewertet, erscheint die Bewertung hier.
            </p>

            <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-sm font-bold text-green-700">
              <span>✓</span>
              Nur verifizierte Käufe
            </div>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
            <aside className="rounded-[2rem] border border-neutral-200 bg-white p-7 shadow-sm lg:sticky lg:top-28 lg:self-start">
              <p className="text-sm font-bold text-neutral-500">
                Durchschnitt
              </p>

              <div className="mt-2 flex items-end gap-2">
                <span className="text-6xl font-black tracking-tight text-neutral-950">
                  {average.toFixed(1)}
                </span>

                <span className="pb-2 text-xl font-bold text-neutral-400">
                  / 5
                </span>
              </div>

              <div className="mt-3 text-2xl tracking-wider text-amber-400">
                {stars(average)}
              </div>

              <p className="mt-2 text-sm font-semibold text-neutral-600">
                Basierend auf {total}{" "}
                {total === 1 ? "Bewertung" : "Bewertungen"}
              </p>

              <div className="mt-8 space-y-3">
                {distribution.map((item) => (
                  <div
                    key={item.rating}
                    className="grid grid-cols-[32px_1fr_40px] items-center gap-3"
                  >
                    <span className="text-sm font-bold text-neutral-700">
                      {item.rating}★
                    </span>

                    <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className="h-full rounded-full bg-red-500"
                        style={{
                          width: `${item.percentage}%`,
                        }}
                      />
                    </div>

                    <span className="text-right text-sm font-semibold text-neutral-500">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-2xl bg-green-50 p-4">
                <p className="flex items-center gap-2 text-sm font-black text-green-800">
                  <span>✓</span>
                  Verifizierter Kauf
                </p>

                <p className="mt-1 text-xs leading-5 text-green-700">
                  Bewertungen werden über einen persönlichen Link
                  nach einer Bestellung abgegeben.
                </p>
              </div>
            </aside>

            <div className="space-y-5">
              {reviews.map((review, index) => (
                <article
                  key={`${review.productSlug}-${review.name}-${review.date}-${index}`}
                  className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-sm md:p-8"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-950 text-lg font-black uppercase text-white">
                        {review.name?.trim()?.charAt(0) || "K"}
                      </div>

                      <h3 className="mt-3 text-lg font-black text-neutral-950">
                        {review.name || "IUMATEC Kunde"}
                      </h3>

                      {review.verified ? (
                        <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-green-700">
                          <span>✓</span>
                          Verifizierter Kauf
                        </p>
                      ) : null}
                    </div>

                    {review.date ? (
                      <time className="text-sm font-medium text-neutral-400">
                        {formatDate(review.date)}
                      </time>
                    ) : null}
                  </div>

                  <div className="mt-5 text-xl tracking-wider text-amber-400">
                    {stars(Number(review.rating))}
                  </div>

                  <p className="mt-4 whitespace-pre-line text-base leading-7 text-neutral-700">
                    {review.text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
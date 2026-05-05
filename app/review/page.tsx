"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function ReviewForm() {
  const searchParams = useSearchParams();

  const productSlug = searchParams.get("product") || "";
  const token = searchParams.get("token") || "";

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const form = new FormData(event.currentTarget);

    const res = await fetch("/api/review", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        productSlug: String(form.get("productSlug") || "").trim(),
        token: String(form.get("token") || "").trim(),
        name: String(form.get("name") || "").trim(),
        rating: Number(form.get("rating") || 5),
        text: String(form.get("text") || "").trim()
      })
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.ok) {
      setError(json?.error || "Bewertung konnte nicht gespeichert werden.");
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-3xl border border-green-100 bg-green-50 p-8 text-center">
          <h1 className="text-3xl font-extrabold text-neutral-950">
            Danke für deine Bewertung!
          </h1>
          <p className="mt-3 text-neutral-600">
            Deine Bewertung wurde gespeichert.
          </p>

          <Link
            href={productSlug ? `/produkte/${productSlug}` : "/produkte"}
            className="mt-6 inline-flex rounded-2xl bg-red-600 px-6 py-4 text-sm font-bold text-white transition hover:bg-red-700"
          >
            Zurück zum Produkt
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-950">
          Bewertung schreiben
        </h1>

        <p className="mt-3 text-neutral-600">
          Teile deine Erfahrung mit diesem Produkt.
        </p>

        {!token ? (
          <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            Hinweis: Für verifizierte Bewertungen brauchst du den Link aus der
            E-Mail nach deiner Bestellung.
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <input type="hidden" name="productSlug" value={productSlug} />
          <input type="hidden" name="token" value={token} />

          <div>
            <label className="mb-2 block text-sm font-bold text-neutral-900">
              Dein Name
            </label>
            <input
              name="name"
              placeholder="z.B. Marco S."
              className="w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none transition focus:border-neutral-900"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-neutral-900">
              Bewertung
            </label>
            <select
              name="rating"
              defaultValue="5"
              className="w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none transition focus:border-neutral-900"
            >
              <option value="5">★★★★★ 5 Sterne</option>
              <option value="4">★★★★ 4 Sterne</option>
              <option value="3">★★★ 3 Sterne</option>
              <option value="2">★★ 2 Sterne</option>
              <option value="1">★ 1 Stern</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-neutral-900">
              Deine Bewertung
            </label>
            <textarea
              name="text"
              rows={6}
              placeholder="Was hat dir gefallen? Wie war die Lieferung?"
              className="w-full rounded-2xl border border-neutral-300 px-4 py-3 outline-none transition focus:border-neutral-900"
              required
            />
          </div>

          {error ? (
            <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-2xl bg-red-600 px-6 py-4 text-sm font-bold text-white transition hover:bg-red-700"
          >
            Bewertung senden
          </button>
        </form>
      </div>
    </main>
  );
}

export default function ReviewPage() {
  return (
    <Suspense fallback={null}>
      <ReviewForm />
    </Suspense>
  );
}
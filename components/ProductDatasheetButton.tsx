"use client";

type Props = {
  slug: string;
};

export default function ProductDatasheetButton({ slug }: Props) {
  return (
    <a
      href={`/api/products/${slug}/datasheet`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center rounded-2xl border border-neutral-300 bg-white px-6 py-4 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
    >
      Produktdatenblatt herunterladen
    </a>
  );
}
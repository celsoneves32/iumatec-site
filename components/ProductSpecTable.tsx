type Props = {
  specs: Array<{ label: string; value: string }>;
};

export default function ProductSpecTable({ specs }: Props) {
  const validSpecs = specs.filter((item) => item.value && item.value.trim() !== "");

  if (!validSpecs.length) return null;

  return (
    <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-6 py-4">
        <h2 className="text-xl font-bold text-neutral-900">Produktdatenblatt</h2>
      </div>

      <div className="divide-y divide-neutral-200">
        {validSpecs.map((spec) => (
          <div
            key={spec.label}
            className="grid gap-2 px-6 py-4 md:grid-cols-[220px_1fr]"
          >
            <div className="text-sm font-semibold text-neutral-500">
              {spec.label}
            </div>
            <div className="text-sm text-neutral-900">{spec.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
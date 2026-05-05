export default function LoadingProductPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="h-[460px] animate-pulse rounded-3xl bg-neutral-100" />
        <div className="space-y-4">
          <div className="h-6 w-24 animate-pulse rounded bg-neutral-100" />
          <div className="h-12 w-3/4 animate-pulse rounded bg-neutral-100" />
          <div className="h-8 w-40 animate-pulse rounded bg-neutral-100" />
          <div className="h-64 animate-pulse rounded-3xl bg-neutral-100" />
        </div>
      </div>
    </main>
  );
}
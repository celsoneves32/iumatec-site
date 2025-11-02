export default function Loading() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="h-8 w-40 bg-gray-200 dark:bg-neutral-800 rounded mb-4" />
      <div className="grid gap-4 sm:gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden"
          >
            <div className="aspect-square bg-gray-100 dark:bg-neutral-800" />
            <div className="p-3 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-neutral-800 rounded" />
              <div className="h-4 w-1/2 bg-gray-200 dark:bg-neutral-800 rounded" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

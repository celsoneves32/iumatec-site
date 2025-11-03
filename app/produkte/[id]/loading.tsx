export default function LoadingProductPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-10 animate-pulse">
      <div className="grid md:grid-cols-2 gap-10">
        {/* IMAGEM */}
        <div className="aspect-square rounded-2xl bg-gray-100 dark:bg-neutral-800" />

        {/* DETALHES */}
        <div>
          <div className="h-8 bg-gray-200 dark:bg-neutral-700 rounded w-2/3 mb-4" />
          <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded w-5/6 mb-8" />

          <div className="h-10 bg-gray-200 dark:bg-neutral-700 rounded w-1/3 mb-6" />

          <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded w-1/2 mb-3" />
          <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded w-2/5 mb-6" />

          <div className="h-12 bg-gray-300 dark:bg-neutral-700 rounded-xl w-48 mb-3" />

          <div className="h-3 bg-gray-200 dark:bg-neutral-700 rounded w-3/4" />
        </div>
      </div>

      {/* ÄHNLICHE PRODUKTE */}
      <section className="mt-14">
        <div className="h-6 bg-gray-200 dark:bg-neutral-700 rounded w-1/3 mb-6" />
        <div className="grid gap-4 sm:gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden"
            >
              <div className="aspect-square bg-gray-100 dark:bg-neutral-800" />
              <div className="p-3">
                <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded w-5/6 mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-neutral-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

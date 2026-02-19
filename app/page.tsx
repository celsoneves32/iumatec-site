<section className="relative overflow-hidden">
  <div className="absolute inset-0 bg-gradient-to-br from-brand/15 via-white to-white" />
  <div className="relative mx-auto max-w-6xl px-4 py-14 grid gap-10 md:grid-cols-2 items-center">
    <div>
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-neutral-900">
        IUMATEC Schweiz — Tech, <span className="text-brand">schnell</span> & sicher.
      </h1>
      <p className="mt-4 text-neutral-600">
        Neuheiten, Bestseller und Zubehör — direkt bereit für deinen Warenkorb.
      </p>

      <div className="mt-6 flex gap-3">
        <Link href="/products" className="rounded-xl bg-brand px-5 py-3 text-white text-sm font-semibold hover:bg-brand-dark transition">
          Produkte ansehen
        </Link>
        <Link href="/collections" className="rounded-xl border border-neutral-300 px-5 py-3 text-sm font-semibold hover:bg-neutral-50 transition">
          Kategorien
        </Link>
      </div>
    </div>

    <div className="rounded-3xl border bg-white/60 backdrop-blur p-3 shadow-sm">
      {/* aqui fica a tua imagem/hero */}
      {/* se já tens um <Image ...>, mete dentro */}
      <div className="aspect-[16/10] rounded-2xl bg-neutral-100" />
    </div>
  </div>
</section>

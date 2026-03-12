function MegaMenuDesktop() {
  return (
    <div className="hidden xl:flex items-center gap-6">
      <div className="relative group">
        <button
          type="button"
          className="relative text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition
                     after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-full
                     after:origin-left after:scale-x-0 after:bg-brand after:transition-transform after:duration-200
                     group-hover:after:scale-x-100"
        >
          Kategorien
        </button>

        <div
          className="pointer-events-none opacity-0 translate-y-2
                     group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto
                     transition absolute left-1/2 top-full z-50 w-[980px] -translate-x-1/2 pt-3"
        >
          <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-2xl p-6">
            <div className="grid grid-cols-3 gap-5">
              {megaMenu.map((group) => (
                <div
                  key={group.title}
                  className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900 p-4 hover:border-neutral-300 dark:hover:border-neutral-700 transition"
                >
                  <div className="mb-4">
                    <Link
                      href={group.href || "/collections"}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100 hover:text-brand"
                    >
                      <SectionIcon title={group.title} />
                      <span>{group.title}</span>
                    </Link>
                  </div>

                  <ul className="space-y-2.5">
                    {group.items.map((item) => (
                      <li key={item.label}>
                        <Link
                          href={item.href}
                          className="block text-sm text-neutral-600 dark:text-neutral-400 hover:text-brand transition"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-neutral-200 dark:border-neutral-800 pt-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  Technik schneller finden
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Entdecke alle Kategorien und finde passende Produkte für Arbeit, Gaming und Alltag.
                </p>
              </div>

              <Link
                href="/collections"
                className="shrink-0 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark transition"
              >
                Alle Kategorien
              </Link>
            </div>
          </div>
        </div>
      </div>

      <NavLink href="/products">Alle Produkte</NavLink>

      {ACCOUNT_URL && (
        <a
          href={ACCOUNT_URL}
          target="_self"
          className="relative text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition
                     after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-full
                     after:origin-left after:scale-x-0 after:bg-brand after:transition-transform after:duration-200
                     hover:after:scale-x-100"
        >
          Mein Konto
        </a>
      )}
    </div>
  );
}

"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import ProductCard from "@/components/ProductCard";

export type CatalogProduct = {
  sku: string;
  slug: string;
  title: string;
  brand?: string;
  price: number;
  image?: string | null;
  category?: string;
  subcategory?: string;
  stockQty?: number;
  inStock?: boolean;
  merchandiseId?: string | null;
  shopifyProductHandle?: string | null;
  productHandle?: string | null;
  energyLabel?: any;
};

type Facet = {
  label: string;
  count: number;
};

type CatalogResponse = {
  products: CatalogProduct[];
  total: number;
  catalogTotal: number;
  offset: number;
  limit: number;
  hasMore: boolean;

  facets: {
    categories: Facet[];
    subcategories: Facet[];
    brands: Facet[];
    available: number;
    minPrice: number;
    maxPrice: number;
  };
};

type Props = {
  initialData: CatalogResponse;
  initialQuery: string;
  initialCategory: string;
  initialSubcategory: string;
};

type Shortcut = {
  label: string;
  category: string;
  subcategory?: string;
  q?: string;
};

/* =========================================================
   ATALHOS GERAIS
   ========================================================= */

const GENERIC_SHORTCUTS: Shortcut[] = [
  {
    label: "Laptops",
    category: "Computer",
    subcategory: "Laptops",
  },

  {
    label: "Monitore",
    category: "Peripherie",
    subcategory: "Monitore",
  },

  {
    label: "Smartphones",
    category: "Mobile",
    subcategory: "Smartphones",
  },

  {
    label: "Tablets",
    category: "Mobile",
    subcategory: "Tablets",
  },

  {
    label: "Grafikkarten",
    category: "PC-Komponenten",
    q: "Grafikkarte",
  },

  {
    label: "Drucker & Scanner",
    category: "Office & Business",
    subcategory: "Drucker & Scanner",
  },
];

/* =========================================================
   ATALHOS CONTEXTUAIS POR CATEGORIA
   ========================================================= */

const CATEGORY_SHORTCUTS: Record<
  string,
  Shortcut[]
> = {
  Computer: [
    {
      label: "Laptops",
      category: "Computer",
      subcategory: "Laptops",
    },

    {
      label: "Desktop-PCs",
      category: "Computer",
      subcategory: "Desktop-PCs",
    },

    {
      label: "Mini-PCs",
      category: "Computer",
      subcategory: "Mini-PCs",
    },

    {
      label: "Computer-Zubehör",
      category: "Computer",
      subcategory: "Computer-Zubehör",
    },
  ],

  "PC-Komponenten": [
    {
      label: "Komponenten",
      category: "PC-Komponenten",
      subcategory: "Komponenten",
    },

    {
      label: "Kabel & Adapter",
      category: "PC-Komponenten",
      subcategory: "Kabel & Adapter",
    },

    {
      label: "Gaming-Komponenten",
      category: "PC-Komponenten",
      subcategory: "Gaming-Komponenten",
    },

    {
      label: "Grafikkarten",
      category: "PC-Komponenten",
      q: "Grafikkarte",
    },

    {
      label: "Prozessoren",
      category: "PC-Komponenten",
      q: "Prozessor",
    },
  ],

  Peripherie: [
    {
      label: "Monitore",
      category: "Peripherie",
      subcategory: "Monitore",
    },

    {
      label: "Tastaturen",
      category: "Peripherie",
      subcategory: "Tastaturen",
    },

    {
      label: "Mäuse",
      category: "Peripherie",
      subcategory: "Mäuse",
    },

    {
      label: "Headsets",
      category: "Peripherie",
      subcategory: "Headsets",
    },

    {
      label: "Webcams",
      category: "Peripherie",
      subcategory: "Webcams",
    },

    {
      label: "Dockingstationen",
      category: "Peripherie",
      subcategory: "Dockingstationen",
    },

    {
      label: "Foto & Video",
      category: "Peripherie",
      subcategory: "Foto & Video",
    },

    {
      label: "Audio",
      category: "Peripherie",
      subcategory: "Audio",
    },
  ],

  Netzwerk: [
    {
      label: "Netzwerk",
      category: "Netzwerk",
      subcategory: "Netzwerk",
    },

    {
      label: "Kabel & Adapter",
      category: "Netzwerk",
      subcategory: "Kabel & Adapter",
    },

    {
      label: "Server",
      category: "Netzwerk",
      subcategory: "Server",
    },

    {
      label: "IT-Sicherheit",
      category: "Netzwerk",
      subcategory: "IT-Sicherheit",
    },
  ],

  Mobile: [
    {
      label: "Smartphones",
      category: "Mobile",
      subcategory: "Smartphones",
    },

    {
      label: "Tablets",
      category: "Mobile",
      subcategory: "Tablets",
    },

    {
      label: "Mobile Zubehör",
      category: "Mobile",
      subcategory: "Mobile Zubehör",
    },
  ],

  "Office & Business": [
    {
      label: "Drucker & Scanner",
      category: "Office & Business",
      subcategory: "Drucker & Scanner",
    },

    {
      label: "Software",
      category: "Office & Business",
      subcategory: "Software",
    },

    {
      label: "Telefonie",
      category: "Office & Business",
      subcategory: "Telefonie",
    },

    {
      label: "Conferencing",
      category: "Office & Business",
      subcategory:
        "Conferencing & Collaboration",
    },

    {
      label: "Professional AV",
      category: "Office & Business",
      subcategory: "Professional AV",
    },

    {
      label: "Professional Audio",
      category: "Office & Business",
      subcategory: "Professional Audio",
    },

    {
      label: "Projektoren",
      category: "Office & Business",
      subcategory: "Projektoren",
    },

    {
      label: "Telefonsysteme",
      category: "Office & Business",
      subcategory: "Telefonsysteme",
    },
  ],

  Datenspeicher: [
    {
      label: "Storage",
      category: "Datenspeicher",
      subcategory: "Storage",
    },

    {
      label: "SSD",
      category: "Datenspeicher",
      q: "SSD",
    },

    {
      label: "HDD",
      category: "Datenspeicher",
      q: "HDD",
    },

    {
      label: "NAS",
      category: "Datenspeicher",
      q: "NAS",
    },
  ],

  "Smart Home": [
    {
      label: "Beleuchtung",
      category: "Smart Home",
      subcategory: "Beleuchtung",
    },

    {
      label: "Gebäudetechnik",
      category: "Smart Home",
      subcategory: "Gebäudetechnik",
    },

    {
      label: "Energie & Strom",
      category: "Smart Home",
      subcategory: "Energie & Strom",
    },

    {
      label: "Sicherheit",
      category: "Smart Home",
      subcategory: "Sicherheit",
    },

    {
      label: "Sicherheit & Überwachung",
      category: "Smart Home",
      subcategory:
        "Sicherheit & Überwachung",
    },

    {
      label: "TV & Home Cinema",
      category: "Smart Home",
      subcategory: "TV & Home Cinema",
    },
  ],
};

/* =========================================================
   CATEGORIA QUE DEVE ABRIR POR DEFEITO
   ========================================================= */

function defaultSubcategoryForCategory(
  category: string,
) {
  /*
   * IMPORTANTE:
   *
   * Quando o cliente clica em "Mobile",
   * queremos mostrar TELEFONES primeiro.
   *
   * Assim evitamos abrir logo cartões,
   * suportes, capas e acessórios baratos.
   */
  if (category === "Mobile") {
    return "Smartphones";
  }

  return "Alle";
}

function resolveInitialSubcategory(
  category: string,
  subcategory: string,
) {
  if (
    subcategory &&
    subcategory !== "Alle"
  ) {
    return subcategory;
  }

  return defaultSubcategoryForCategory(
    category,
  );
}

/* =========================================================
   FORMATAÇÃO
   ========================================================= */

const formatCount = (
  value: number,
) => {
  const integer = Math.trunc(
    Number.isFinite(value)
      ? value
      : 0,
  );

  const sign =
    integer < 0 ? "-" : "";

  const digits = Math.abs(
    integer,
  ).toString();

  return `${sign}${digits.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    "’",
  )}`;
};

/* =========================================================
   COMPONENTE PRINCIPAL
   ========================================================= */

export default function ProductsCatalogClient({
  initialData,
  initialQuery,
  initialCategory,
  initialSubcategory,
}: Props) {
  const resolvedInitialSubcategory =
    resolveInitialSubcategory(
      initialCategory,
      initialSubcategory,
    );

  const [data, setData] =
    useState(initialData);

  const [products, setProducts] =
    useState(
      initialData.products,
    );

  const [query, setQuery] =
    useState(initialQuery);

  const [
    debouncedQuery,
    setDebouncedQuery,
  ] = useState(initialQuery);

  const [category, setCategory] =
    useState(initialCategory);

  const [
    subcategory,
    setSubcategory,
  ] = useState(
    resolvedInitialSubcategory,
  );

  const [brands, setBrands] =
    useState<string[]>([]);

  const [inStock, setInStock] =
    useState(false);

  const [sort, setSort] =
    useState("featured");

  const [
    minPrice,
    setMinPrice,
  ] = useState<
    number | undefined
  >();

  const [
    maxPrice,
    setMaxPrice,
  ] = useState<
    number | undefined
  >();

  const [loading, setLoading] =
    useState(false);

  const requestId = useRef(0);

  /* =======================================================
     SEARCH DEBOUNCE
     ======================================================= */

  useEffect(() => {
    const timer =
      window.setTimeout(
        () =>
          setDebouncedQuery(
            query.trim(),
          ),
        400,
      );

    return () =>
      window.clearTimeout(
        timer,
      );
  }, [query]);

  /* =======================================================
     URL DA API
     ======================================================= */

  const requestUrl = useMemo(() => {
    const params =
      new URLSearchParams();

    if (debouncedQuery) {
      params.set(
        "q",
        debouncedQuery,
      );
    }

    if (category !== "Alle") {
      params.set(
        "category",
        category,
      );
    }

    if (
      subcategory !== "Alle"
    ) {
      params.set(
        "subcategory",
        subcategory,
      );
    }

    brands.forEach((brand) =>
      params.append(
        "brand",
        brand,
      ),
    );

    if (inStock) {
      params.set(
        "inStock",
        "1",
      );
    }

    if (sort !== "featured") {
      params.set(
        "sort",
        sort,
      );
    }

    if (
      minPrice !== undefined
    ) {
      params.set(
        "minPrice",
        String(minPrice),
      );
    }

    if (
      maxPrice !== undefined
    ) {
      params.set(
        "maxPrice",
        String(maxPrice),
      );
    }

    params.set(
      "limit",
      "24",
    );

    return `/api/products?${params.toString()}`;
  }, [
    debouncedQuery,
    category,
    subcategory,
    brands,
    inStock,
    sort,
    minPrice,
    maxPrice,
  ]);

  /* =======================================================
     CARREGAR PRODUTOS
     ======================================================= */

  useEffect(() => {
    const controller =
      new AbortController();

    const currentRequest =
      ++requestId.current;

    const run = async () => {
      setLoading(true);
      setProducts([]);

      try {
        const response =
          await fetch(
            requestUrl,
            {
              signal:
                controller.signal,
            },
          );

        if (!response.ok) {
          throw new Error(
            "Katalog konnte nicht geladen werden",
          );
        }

        const next: CatalogResponse =
          await response.json();

        if (
          currentRequest !==
          requestId.current
        ) {
          return;
        }

        setData(
          (current) => ({
            ...next,

            catalogTotal:
              current.catalogTotal,

            facets:
              current.facets,
          }),
        );

        setProducts(
          next.products,
        );

        setLoading(false);

        /* ===========================
           ATUALIZAR URL DO BROWSER
           =========================== */

        const url = new URL(
          window.location.href,
        );

        const requestParams =
          new URL(
            requestUrl,
            window.location.origin,
          ).searchParams;

        [
          "q",
          "category",
          "subcategory",
          "sort",
          "inStock",
          "minPrice",
          "maxPrice",
        ].forEach((name) => {
          const value =
            requestParams.get(
              name,
            );

          if (value) {
            url.searchParams.set(
              name,
              value,
            );
          } else {
            url.searchParams.delete(
              name,
            );
          }
        });

        url.searchParams.delete(
          "brand",
        );

        requestParams
          .getAll("brand")
          .forEach((brand) => {
            url.searchParams.append(
              "brand",
              brand,
            );
          });

        window.history.replaceState(
          null,
          "",
          `${url.pathname}${url.search}`,
        );

        /* ===========================
           FACETS / CONTADORES
           =========================== */

        const facetsUrl =
          new URL(
            requestUrl,
            window.location.origin,
          );

        facetsUrl.searchParams.set(
          "facets",
          "1",
        );

        const facetsResponse =
          await fetch(
            `${facetsUrl.pathname}${facetsUrl.search}`,
            {
              signal:
                controller.signal,
            },
          );

        if (
          facetsResponse.ok &&
          currentRequest ===
            requestId.current
        ) {
          const full: CatalogResponse =
            await facetsResponse.json();

          setData(
            (current) => ({
              ...current,

              catalogTotal:
                full.catalogTotal,

              facets:
                full.facets,
            }),
          );
        }
      } catch (error) {
        if (
          (error as Error)
            .name !==
          "AbortError"
        ) {
          console.error(
            error,
          );
        }
      } finally {
        if (
          !controller.signal
            .aborted &&
          currentRequest ===
            requestId.current
        ) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      controller.abort();
    };
  }, [requestUrl]);

  /* =======================================================
     LOAD MORE
     ======================================================= */

  async function loadMore() {
    setLoading(true);

    try {
      const url = new URL(
        requestUrl,
        window.location.origin,
      );

      url.searchParams.set(
        "offset",
        String(
          products.length,
        ),
      );

      url.searchParams.delete(
        "facets",
      );

      const response =
        await fetch(
          `${url.pathname}${url.search}`,
        );

      const next: CatalogResponse =
        await response.json();

      setProducts(
        (current) => [
          ...current,
          ...next.products,
        ],
      );

      setData(
        (current) => ({
          ...next,

          catalogTotal:
            current.catalogTotal,

          facets:
            current.facets,
        }),
      );
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     RESET
     ======================================================= */

  function reset() {
    setQuery("");
    setDebouncedQuery("");

    setCategory("Alle");
    setSubcategory("Alle");

    setBrands([]);

    setInStock(false);

    setSort("featured");

    setMinPrice(
      undefined,
    );

    setMaxPrice(
      undefined,
    );
  }

  /* =======================================================
     ESCOLHER CATEGORIA
     ======================================================= */

  function chooseCategory(
    nextCategory: string,
  ) {
    setQuery("");
    setDebouncedQuery("");

    setCategory(
      nextCategory,
    );

    setSubcategory(
      defaultSubcategoryForCategory(
        nextCategory,
      ),
    );

    setBrands([]);
  }

  /* =======================================================
     ATALHOS
     ======================================================= */

  function chooseShortcut(
    shortcut: Shortcut,
  ) {
    const nextQuery =
      shortcut.q || "";

    setCategory(
      shortcut.category,
    );

    setSubcategory(
      shortcut.subcategory ||
        "Alle",
    );

    setQuery(nextQuery);
    setDebouncedQuery(
      nextQuery,
    );

    setBrands([]);
  }

  /* =======================================================
     ATALHOS VISÍVEIS
     ======================================================= */

  const activeShortcuts =
    category !== "Alle" &&
    CATEGORY_SHORTCUTS[
      category
    ]
      ? CATEGORY_SHORTCUTS[
          category
        ]
      : GENERIC_SHORTCUTS;

  const totalShown =
    products.length;

  const hasMore =
    totalShown < data.total;

  const pageTitle =
    category === "Alle"
      ? "Produkte"
      : category;

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <main className="min-h-screen bg-neutral-50">
      {/* ===========================
          CABEÇALHO
          =========================== */}

      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="inline-flex rounded-full bg-red-50 px-4 py-2 text-sm font-extrabold text-red-700">
                {formatCount(
                  data.catalogTotal,
                )}{" "}
                Produkte im Katalog
              </div>

              <h1 className="mt-4 text-4xl font-black text-neutral-950 md:text-5xl">
                {pageTitle}
              </h1>

              <p className="mt-2 text-sm text-neutral-600">
                {formatCount(
                  data.total,
                )}{" "}
                Produkte gefunden ·{" "}
                {formatCount(
                  totalShown,
                )}{" "}
                angezeigt
              </p>
            </div>

            <div className="flex w-full max-w-3xl flex-col gap-3 md:flex-row">
              <input
                value={query}
                onChange={(
                  event,
                ) =>
                  setQuery(
                    event.target
                      .value,
                  )
                }
                placeholder="Suche nach Produkt, Marke oder SKU"
                className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-900"
              />

              <select
                value={sort}
                onChange={(
                  event,
                ) =>
                  setSort(
                    event.target
                      .value,
                  )
                }
                className="rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold"
              >
                <option value="featured">
                  Empfohlen
                </option>

                <option value="price-desc">
                  Preis: Hoch zu Tief
                </option>

                <option value="price-asc">
                  Preis: Tief zu Hoch
                </option>

                <option value="title-asc">
                  Name: A bis Z
                </option>

                <option value="brand-asc">
                  Marke: A bis Z
                </option>
              </select>
            </div>
          </div>

          {/* ===========================
              ATALHOS CONTEXTUAIS
              =========================== */}

          <div className="mt-6 flex flex-wrap gap-2">
            {activeShortcuts.map(
              (shortcut) => {
                const active =
                  category ===
                    shortcut.category &&
                  subcategory ===
                    (shortcut.subcategory ||
                      "Alle") &&
                  query ===
                    (shortcut.q ||
                      "");

                return (
                  <button
                    key={`${shortcut.label}-${shortcut.category}`}
                    type="button"
                    onClick={() =>
                      chooseShortcut(
                        shortcut,
                      )
                    }
                    className={`
                      rounded-full
                      border
                      px-4
                      py-2
                      text-sm
                      font-extrabold
                      transition
                      ${
                        active
                          ? "border-red-600 bg-red-600 text-white"
                          : "border-neutral-200 bg-white text-neutral-700 hover:border-red-500 hover:text-red-700"
                      }
                    `}
                  >
                    {
                      shortcut.label
                    }
                  </button>
                );
              },
            )}

            {category !== "Alle" ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setDebouncedQuery("");

                  setSubcategory(
                    "Alle",
                  );

                  setBrands([]);
                }}
                className={`
                  rounded-full
                  border
                  px-4
                  py-2
                  text-sm
                  font-extrabold
                  transition
                  ${
                    subcategory ===
                      "Alle" &&
                    !query
                      ? "border-neutral-950 bg-neutral-950 text-white"
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-950"
                  }
                `}
              >
                Alle {category}
              </button>
            ) : (
              <button
                type="button"
                onClick={reset}
                className="rounded-full border border-neutral-950 bg-neutral-950 px-4 py-2 text-sm font-extrabold text-white"
              >
                Alle anzeigen
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ===========================
          CONTEÚDO
          =========================== */}

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-8 xl:grid-cols-[320px_1fr]">
        {/* ===========================
            FILTROS
            =========================== */}

        <aside className="h-fit rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm xl:sticky xl:top-28">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black">
              Filter
            </h2>

            <button
              type="button"
              onClick={reset}
              className="rounded-full bg-neutral-100 px-3 py-2 text-xs font-extrabold"
            >
              Zurücksetzen
            </button>
          </div>

          {/* STOCK */}

          <label className="mt-6 flex items-center justify-between rounded-2xl border p-4">
            <span className="flex items-center gap-3 text-sm font-bold">
              <input
                type="checkbox"
                checked={inStock}
                onChange={(
                  event,
                ) =>
                  setInStock(
                    event.target
                      .checked,
                  )
                }
              />

              Sofort lieferbar
            </span>

            <span className="text-xs text-neutral-400">
              {formatCount(
                data.facets
                  .available,
              )}
            </span>
          </label>

          {/* CATEGORIAS */}

          <Filter title="Kategorie">
            {[
              {
                label: "Alle",
                count:
                  data.catalogTotal,
              },

              ...data.facets
                .categories,
            ]
              .slice(0, 13)
              .map((item) => (
                <FilterButton
                  key={item.label}
                  item={item}
                  active={
                    category ===
                    item.label
                  }
                  onClick={() => {
                    if (
                      item.label ===
                      "Alle"
                    ) {
                      reset();
                    } else {
                      chooseCategory(
                        item.label,
                      );
                    }
                  }}
                />
              ))}
          </Filter>

          {/* SUBCATEGORIAS */}

          <Filter title="Subkategorie">
            <div className="max-h-72 overflow-y-auto">
              {[
                {
                  label: "Alle",
                  count:
                    data.total,
                },

                ...data.facets
                  .subcategories,
              ]
                .slice(0, 41)
                .map((item) => (
                  <FilterButton
                    key={item.label}
                    item={item}
                    active={
                      subcategory ===
                      item.label
                    }
                    onClick={() => {
                      setQuery("");
                      setDebouncedQuery(
                        "",
                      );

                      setSubcategory(
                        item.label,
                      );

                      setBrands([]);
                    }}
                  />
                ))}
            </div>
          </Filter>

          {/* PREÇO */}

          <Filter title="Preis">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                placeholder="Min."
                value={
                  minPrice ?? ""
                }
                onChange={(
                  event,
                ) =>
                  setMinPrice(
                    event.target
                      .value
                      ? Number(
                          event
                            .target
                            .value,
                        )
                      : undefined,
                  )
                }
                className="w-full rounded-xl border px-3 py-2"
              />

              <input
                type="number"
                placeholder="Max."
                value={
                  maxPrice ?? ""
                }
                onChange={(
                  event,
                ) =>
                  setMaxPrice(
                    event.target
                      .value
                      ? Number(
                          event
                            .target
                            .value,
                        )
                      : undefined,
                  )
                }
                className="w-full rounded-xl border px-3 py-2"
              />
            </div>
          </Filter>

          {/* MARCAS */}

          <Filter title="Marke">
            <div className="max-h-80 overflow-y-auto">
              {data.facets.brands.map(
                (item) => (
                  <label
                    key={item.label}
                    className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-neutral-50"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <input
                        type="checkbox"
                        checked={brands.includes(
                          item.label,
                        )}
                        onChange={() =>
                          setBrands(
                            (
                              current,
                            ) =>
                              current.includes(
                                item.label,
                              )
                                ? current.filter(
                                    (
                                      brand,
                                    ) =>
                                      brand !==
                                      item.label,
                                  )
                                : [
                                    ...current,

                                    item.label,
                                  ],
                          )
                        }
                      />

                      <span className="truncate text-sm font-semibold">
                        {
                          item.label
                        }
                      </span>
                    </span>

                    <span className="text-xs text-neutral-400">
                      {formatCount(
                        item.count,
                      )}
                    </span>
                  </label>
                ),
              )}
            </div>
          </Filter>
        </aside>

        {/* ===========================
            PRODUTOS
            =========================== */}

        <section>
          <h2 className="mb-5 text-2xl font-black">
            {formatCount(
              data.total,
            )}{" "}
            Produkte gefunden
          </h2>

          {loading &&
          products.length ===
            0 ? (
            <div className="rounded-3xl border bg-white p-10 text-center">
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-neutral-200 border-t-red-600" />

              <p className="mt-4 font-bold text-neutral-600">
                Produkte werden
                gesucht…
              </p>
            </div>
          ) : products.length ? (
            <>
              <div
                className={`
                  grid
                  gap-6
                  sm:grid-cols-2
                  lg:grid-cols-3
                  2xl:grid-cols-4
                  ${
                    loading
                      ? "opacity-70"
                      : ""
                  }
                `}
              >
                {products.map(
                  (product) => (
                    <ProductCard
                      key={`${product.sku}-${product.slug}`}
                      product={{
                        ...product,

                        productHandle:
                          product.shopifyProductHandle ||
                          product.productHandle ||
                          product.slug,
                      }}
                    />
                  ),
                )}
              </div>

              {hasMore ? (
                <div className="mt-10 text-center">
                  <button
                    type="button"
                    disabled={
                      loading
                    }
                    onClick={
                      loadMore
                    }
                    className="rounded-2xl bg-red-600 px-8 py-4 text-sm font-extrabold text-white disabled:opacity-60"
                  >
                    {loading
                      ? "Wird geladen…"
                      : "Mehr Produkte laden"}
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <div className="rounded-3xl border bg-white p-10 text-center">
              <h3 className="text-2xl font-black">
                Keine Produkte gefunden
              </h3>

              <button
                type="button"
                onClick={reset}
                className="mt-6 rounded-2xl bg-red-600 px-6 py-4 font-extrabold text-white"
              >
                Alle Produkte anzeigen
              </button>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

/* =========================================================
   FILTER SECTION
   ========================================================= */

function Filter({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6 border-t border-neutral-200 pt-5">
      <h3 className="mb-3 text-sm font-extrabold">
        {title}
      </h3>

      {children}
    </div>
  );
}

/* =========================================================
   FILTER BUTTON
   ========================================================= */

function FilterButton({
  item,
  active,
  onClick,
}: {
  item: Facet;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex
        w-full
        items-center
        justify-between
        rounded-xl
        px-3
        py-2
        text-left
        text-sm
        ${
          active
            ? "bg-red-50 font-extrabold text-red-700"
            : "font-semibold text-neutral-700 hover:bg-neutral-50"
        }
      `}
    >
      <span className="truncate">
        {item.label}
      </span>

      <span className="ml-3 text-xs text-neutral-400">
        {formatCount(
          item.count,
        )}
      </span>
    </button>
  );
}
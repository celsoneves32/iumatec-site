import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  queryCatalog,
  queryCatalogProducts,
} from "@/lib/supabaseCatalog";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
) {
  try {
    const params =
      request.nextUrl.searchParams;

    const number = (
      name: string,
    ) => {
      const value =
        params.get(name);

      if (
        value === null ||
        value === ""
      ) {
        return undefined;
      }

      const parsed =
        Number(value);

      return Number.isFinite(
        parsed,
      )
        ? parsed
        : undefined;
    };

    const query = {
      q:
        params.get("q") ||
        undefined,

      category:
        params.get("category") ||
        undefined,

      subcategory:
        params.get(
          "subcategory",
        ) || undefined,

      brands:
        params.getAll("brand"),

      minPrice:
        number("minPrice"),

      maxPrice:
        number("maxPrice"),

      inStock:
        params.get(
          "inStock",
        ) === "1",

      sort:
        (params.get("sort") ||
          "featured") as
          | "featured"
          | "price-desc"
          | "price-asc"
          | "title-asc"
          | "brand-asc",

      offset:
        number("offset"),

      limit:
        number("limit"),
    };

    const wantsFacets =
      params.get("facets") ===
      "1";

    /*
     * Produtos visíveis:
     * usamos a consulta direta rápida.
     *
     * Facets:
     * tentamos o RPC antigo.
     * Se falhar, não deixamos
     * a página inteira cair.
     */
    if (!wantsFacets) {
      const result =
        await queryCatalogProducts(
          query,
        );

      return NextResponse.json(
        result,
        {
          headers: {
            "Cache-Control":
              "public, s-maxage=60, stale-while-revalidate=300",
          },
        },
      );
    }

    try {
      const result =
        await queryCatalog(query);

      return NextResponse.json(
        result,
        {
          headers: {
            "Cache-Control":
              "public, s-maxage=60, stale-while-revalidate=300",
          },
        },
      );
    } catch (facetError) {
      console.warn(
        "Facet RPC failed. Falling back to fast catalog:",
        facetError,
      );

      const fallback =
        await queryCatalogProducts(
          query,
        );

      return NextResponse.json(
        fallback,
        {
          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }
  } catch (error) {
    console.error(
      "GET /api/products error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Der Produktkatalog konnte nicht geladen werden.",
      },
      {
        status: 500,
      },
    );
  }
}
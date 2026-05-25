import React from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import ProductDatasheetDocument from "@/components/pdf/ProductDatasheetDocument";
import { getDeliveryText } from "@/lib/delivery";
import { getAllProductSlugs, getProductBySlug } from "@/lib/productData";
import { buildProductPdfFilename } from "@/lib/pdfFilename";
import { getStockStatus } from "@/lib/stock";

export const runtime = "nodejs";

type RouteContext = {
  params: {
    slug: string;
  };
};

export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  const product = getProductBySlug(params.slug);

  if (!product) {
    return NextResponse.json({ error: "Produkt nicht gefunden" }, { status: 404 });
  }

  const stock = getStockStatus(product);
  const delivery = getDeliveryText(product.deliveryDate);
  const filename = buildProductPdfFilename({
    title: product.title,
    sku: product.sku,
  });

  const pdfBuffer = await renderToBuffer(
  React.createElement(ProductDatasheetDocument as any, {
    product,
    stock,
    delivery: delivery || "Lieferdatum folgt",
  }) as any
);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

export function generateStaticParams() {
  return getAllProductSlugs().slice(0, 12000).map((slug) => ({ slug }));
}
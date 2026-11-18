import { NextRequest, NextResponse } from "next/server";
import {
  clearSession, getSession, refreshedSession, saveSession, storeDomain,
} from "@/lib/shopifyCustomerAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" };
const money = "amount currencyCode";
const basicOrder = `
  id name processedAt financialStatus fulfillmentStatus statusPageUrl
  totalPrice { ${money} }
  lineItems(first: 4) { nodes { id title quantity totalPrice { ${money} } image { url altText } } }
`;
const listQuery = `query IumatecOrders($after: String) {
  customer { orders(first: 15, after: $after, sortKey: PROCESSED_AT, reverse: true) {
    pageInfo { hasNextPage endCursor }
    nodes { ${basicOrder} }
  } }
}`;
const detailQuery = `query IumatecOrder($id: ID!) {
  order(id: $id) {
    id name processedAt financialStatus fulfillmentStatus statusPageUrl
    subtotal { ${money} } totalPrice { ${money} } totalShipping { ${money} }
    totalTax { ${money} } totalRefunded { ${money} }
    shippingLine { title }
    shippingAddress { name address1 address2 zip city country phoneNumber }
    billingAddress { name address1 address2 zip city country phoneNumber }
    paymentInformation {
      paymentStatus totalPaidAmount { ${money} } totalOutstandingAmount { ${money} }
      paymentCollectionUrl
      paymentTerms { paymentTermsName nextDueAt paymentSchedules(first: 24) {
        nodes { id completed dueAt totalBalance { ${money} } }
      } }
    }
    lineItems(first: 100) { nodes {
      id title variantTitle quantity totalPrice { ${money} }
      image { url altText }
    } }
    fulfillments(first: 15) { nodes {
      id status updatedAt trackingInformation { company number url }
    } }
  }
}`;
// Graceful degradation if an optional field isn't yet enabled for this shop.
const essentialDetailQuery = `query IumatecOrderEssential($id: ID!) {
  order(id: $id) { ${basicOrder} }
}`;

type GraphQLResponse = { data?: Record<string, any>; errors?: Array<{ message?: string }> };
function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers });
}
async function endpoint(): Promise<string> {
  const res = await fetch(`https://${storeDomain()}/.well-known/customer-account-api`, { cache: "no-store" });
  if (!res.ok) throw new Error("discovery_failed");
  const data = await res.json() as { graphql_api?: string };
  if (!data.graphql_api) throw new Error("graphql_endpoint_missing");
  const url = new URL(data.graphql_api);
  const host = url.hostname.toLowerCase();
  const shop = storeDomain().toLowerCase();
  if (url.protocol !== "https:" || url.username || url.password ||
    !(host === shop || host === "account.iumatec.ch" || host.endsWith(".myshopify.com") || host.endsWith(".shopify.com"))) {
    throw new Error("unexpected_account_api_host");
  }
  return url.toString();
}
async function query(url: string, token: string, document: string, variables: Record<string, string | null>): Promise<GraphQLResponse> {
  const response = await fetch(url, {
    method: "POST", cache: "no-store",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({ query: document, variables }),
  });
  if (!response.ok) throw new Error("account_api_http_" + response.status);
  return response.json() as Promise<GraphQLResponse>;
}
export async function GET(req: NextRequest) {
  const previous = getSession(req);
  if (!previous) return json({ error: "not_authenticated" }, 401);
  const current = await refreshedSession(previous);
  if (!current) {
    const response = json({ error: "session_expired" }, 401);
    clearSession(response);
    return response;
  }
  const rawId = req.nextUrl.searchParams.get("id");
  const after = req.nextUrl.searchParams.get("after");
  if (rawId !== null && !/^gid:\/\/shopify\/Order\/\d+$/.test(rawId)) return json({ error: "invalid_order_id" }, 400);
  if (after !== null && (after.length > 1200 || /[\x00-\x1f]/.test(after))) return json({ error: "invalid_cursor" }, 400);
  try {
    const url = await endpoint();
    const result = rawId
      ? await query(url, current.accessToken, detailQuery, { id: rawId })
      : await query(url, current.accessToken, listQuery, { after });
    let output: Record<string, unknown>;
    if (rawId) {
      if (result.errors?.length) {
        const fallback = await query(url, current.accessToken, essentialDetailQuery, { id: rawId });
        if (fallback.errors?.length) throw new Error("order_permissions_or_schema_error");
        if (!fallback.data?.order) return json({ error: "not_found" }, 404);
        output = { order: fallback.data.order, limited: true };
      } else {
        if (!result.data?.order) return json({ error: "not_found" }, 404);
        output = { order: result.data.order, limited: false };
      }
    } else {
      if (result.errors?.length) throw new Error("orders_permissions_or_schema_error");
      const connection = result.data?.customer?.orders;
      if (!connection || !Array.isArray(connection.nodes)) throw new Error("orders_missing");
      output = {
        orders: connection.nodes,
        hasNextPage: Boolean(connection.pageInfo?.hasNextPage),
        endCursor: connection.pageInfo?.endCursor ?? null,
      };
    }
    const response = json(output);
    if (current !== previous) saveSession(response, current);
    return response;
  } catch (e) {
    // Intentionally exclude customer data and tokens from server logs.
    console.error("IUMATEC_KONTO_ORDERS", e instanceof Error ? e.message : "unexpected_error");
    return json({ error: "orders_temporarily_unavailable" }, 502);
  }
}

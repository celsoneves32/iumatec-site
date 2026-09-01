const SHOP = "iumatec-2.myshopify.com";
const API_VERSION = "2025-04";

const TOKEN =
  process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ||
  process.env.SHOPIFY_ADMIN_TOKEN ||
  process.env.SHOPIFY_ACCESS_TOKEN;

if (!TOKEN) {
  console.error("ERRO: token Shopify Admin não encontrado no .env.local");
  console.error("Procurei:");
  console.error("- SHOPIFY_ADMIN_ACCESS_TOKEN");
  console.error("- SHOPIFY_ADMIN_TOKEN");
  console.error("- SHOPIFY_ACCESS_TOKEN");
  process.exit(1);
}

const ids = [
  "gid://shopify/ProductVariant/57671848493440",
  "gid://shopify/ProductVariant/57671858192768"
];

const query = `
query VariantCheck($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on ProductVariant {
      id
      sku
      price
      product {
        id
        title
        handle
        status
      }
    }
  }
}
`;

const response = await fetch(
  `https://${SHOP}/admin/api/${API_VERSION}/graphql.json`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": TOKEN
    },
    body: JSON.stringify({
      query,
      variables: { ids }
    })
  }
);

const json = await response.json();

if (!response.ok || json.errors) {
  console.error("ERRO SHOPIFY:");
  console.error(JSON.stringify(json, null, 2));
  process.exit(1);
}

console.log("");
console.log("===== RESULTADO SHOPIFY DIRETO =====");

ids.forEach((id, index) => {
  const node = json?.data?.nodes?.[index];

  console.log("");
  console.log("-----------------------------------");
  console.log("Variant ID:", id);

  if (!node) {
    console.log("EXISTE NA SHOPIFY: NAO");
  } else {
    console.log("EXISTE NA SHOPIFY: SIM");
    console.log("SKU:", node.sku);
    console.log("PRICE:", node.price);
    console.log("PRODUCT:", node.product?.title);
    console.log("HANDLE:", node.product?.handle);
    console.log("STATUS:", node.product?.status);
  }
});

console.log("");
console.log("NADA FOI ALTERADO.");
console.log("NAO EXECUTAR --apply.");

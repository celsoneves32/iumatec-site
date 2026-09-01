const SHOP = "iumatec-2.myshopify.com";
const API_VERSION = "2025-04";

const TOKEN =
  process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ||
  process.env.SHOPIFY_ADMIN_TOKEN ||
  process.env.SHOPIFY_ACCESS_TOKEN;

if (!TOKEN) {
  console.error("ERRO: token Shopify Admin não encontrado.");
  process.exit(1);
}

const ids = [
  "gid://shopify/ProductVariant/57671848493440",
  "gid://shopify/ProductVariant/57671858192768"
];

const query = `
query CheckVariants($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on ProductVariant {
      id
      sku
      barcode
      price
      inventoryQuantity
      inventoryPolicy

      inventoryItem {
        id
        tracked
      }

      product {
        id
        title
        handle
        status
        onlineStoreUrl
        totalInventory
        updatedAt
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
console.log("===== RESULTADO =====");

for (const node of json.data.nodes) {

  console.log("");
  console.log("========================================");

  if (!node) {
    console.log("VARIANTE NÃO ENCONTRADA");
    continue;
  }

  console.log("Variant ID       :", node.id);
  console.log("SKU              :", node.sku);
  console.log("Barcode          :", node.barcode);
  console.log("Preço            :", node.price);
  console.log("Inventory Qty    :", node.inventoryQuantity);
  console.log("Inventory Policy :", node.inventoryPolicy);
  console.log("Inventory tracked:", node.inventoryItem?.tracked);

  console.log("");
  console.log("Produto          :", node.product?.title);
  console.log("Status           :", node.product?.status);
  console.log("Total Inventory  :", node.product?.totalInventory);
  console.log("Online Store URL :", node.product?.onlineStoreUrl);
  console.log("Updated At       :", node.product?.updatedAt);
}

console.log("");
console.log("NADA FOI ALTERADO.");
console.log("NAO APAGAR OS 488.");
console.log("NAO EXECUTAR --apply SHOPIFY.");

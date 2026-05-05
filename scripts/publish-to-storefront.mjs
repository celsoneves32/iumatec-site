import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function loadEnv(file) {
  const filePath = path.join(ROOT, file);
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();

    value = value.replace(/^["']|["']$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnv(".env.local");
loadEnv(".env");

const SHOPIFY_STORE_DOMAIN =
  process.env.SHOPIFY_STORE_DOMAIN ||
  process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;

const SHOPIFY_ADMIN_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

const SHOPIFY_ADMIN_API_VERSION =
  process.env.SHOPIFY_ADMIN_API_VERSION || "2025-04";

if (!SHOPIFY_STORE_DOMAIN) {
  throw new Error("Missing SHOPIFY_STORE_DOMAIN");
}

if (!SHOPIFY_ADMIN_ACCESS_TOKEN) {
  throw new Error("Missing SHOPIFY_ADMIN_ACCESS_TOKEN");
}

const ADMIN_API = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_ADMIN_API_VERSION}/graphql.json`;

const REQUEST_DELAY_MS = 120;
const RETRY_DELAY_MS = 1500;
const MAX_RETRIES = 5;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function shopifyAdmin(query, variables = {}, retries = MAX_RETRIES) {
  try {
    const res = await fetch(ADMIN_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_ADMIN_ACCESS_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    });

    const text = await res.text();

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(
        `Shopify returned non-JSON response (${res.status}): ${text.slice(0, 300)}`
      );
    }

    if (!res.ok) {
      throw new Error(`Shopify Admin HTTP ${res.status}: ${JSON.stringify(json)}`);
    }

    if (json.errors?.length) {
      throw new Error(json.errors.map((e) => e.message).join(" | "));
    }

    return json.data;
  } catch (error) {
    if (retries > 0) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`Retrying Shopify request... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`);
      console.log(message.slice(0, 250));
      await sleep(RETRY_DELAY_MS);
      return shopifyAdmin(query, variables, retries - 1);
    }

    throw error;
  }
}

async function getPublications() {
  const query = `
    query {
      publications(first: 20) {
        nodes {
          id
          name
        }
      }
    }
  `;

  const data = await shopifyAdmin(query);
  return data.publications.nodes;
}

async function publishProduct(productId, publicationId) {
  const mutation = `
    mutation PublishProduct($id: ID!, $publicationId: ID!) {
      publishablePublish(
        id: $id,
        input: {
          publicationId: $publicationId
        }
      ) {
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await shopifyAdmin(mutation, {
    id: productId,
    publicationId,
  });

  return data.publishablePublish.userErrors || [];
}

async function main() {
  const file = path.join(
    ROOT,
    "integrations",
    "alltron",
    "out",
    "iumatec-catalog-enriched.json"
  );

  if (!fs.existsSync(file)) {
    throw new Error(`Missing file: ${file}`);
  }

  const data = JSON.parse(fs.readFileSync(file, "utf8"));

  const publications = await getPublications();

  console.log("Publications found:");
  for (const pub of publications) {
    console.log(`- ${pub.name}: ${pub.id}`);
  }

  const selectedPublications = publications.filter((pub) => {
    const name = pub.name.toLowerCase();
    return (
      name.includes("online") ||
      name.includes("loja") ||
      name.includes("virtual") ||
      name.includes("iumatec") ||
      name.includes("storefront")
    );
  });

  if (selectedPublications.length === 0) {
    throw new Error("No matching publication found.");
  }

  console.log("Selected publications:");
  for (const pub of selectedPublications) {
    console.log(`- ${pub.name}: ${pub.id}`);
  }

  const productIds = Array.from(
    new Set(
      data
        .map((item) => item.shopifyProductId)
        .filter(
          (id) =>
            typeof id === "string" &&
            id.startsWith("gid://shopify/Product/")
        )
    )
  );

  console.log(`Products to publish: ${productIds.length}`);

  let published = 0;
  let errors = 0;

  for (const productId of productIds) {
    for (const publication of selectedPublications) {
      try {
        const userErrors = await publishProduct(productId, publication.id);

        if (userErrors.length > 0) {
          errors += 1;
          console.log("Publish error:", productId, publication.name, userErrors);
        }
      } catch (error) {
        errors += 1;
        console.log(
          "Publish request failed:",
          productId,
          publication.name,
          error instanceof Error ? error.message : String(error)
        );
      }

      await sleep(REQUEST_DELAY_MS);
    }

    published += 1;

    if (published % 50 === 0) {
      console.log(`Published ${published}/${productIds.length}`);
    }
  }

  console.log("DONE");
  console.log({ published, errors });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
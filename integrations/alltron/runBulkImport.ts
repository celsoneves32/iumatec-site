import fs from "fs";
import FormData from "form-data";
import { shopifyAdminFetch } from "./shopifyAdmin";

type StagedTarget = {
  url: string;
  resourceUrl: string;
  parameters: { name: string; value: string }[];
};

export async function createStagedUploadTarget(fileName: string, fileSize: number): Promise<StagedTarget> {
  const mutation = `
    mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets {
          url
          resourceUrl
          parameters {
            name
            value
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await shopifyAdminFetch<{
    stagedUploadsCreate: {
      stagedTargets: StagedTarget[];
      userErrors: { field?: string[]; message: string }[];
    };
  }>(mutation, {
    input: [
      {
        filename: fileName,
        mimeType: "text/jsonl",
        resource: "BULK_MUTATION_VARIABLES",
        httpMethod: "POST",
        fileSize: String(fileSize),
      },
    ],
  });

  const payload = data.stagedUploadsCreate;

  if (payload.userErrors.length) {
    throw new Error(`stagedUploadsCreate userErrors: ${JSON.stringify(payload.userErrors)}`);
  }

  return payload.stagedTargets[0];
}

export async function uploadJsonlToStagedTarget(filePath: string, target: StagedTarget): Promise<string> {
  const form = new FormData();

  for (const param of target.parameters) {
    form.append(param.name, param.value);
  }

  form.append("file", fs.createReadStream(filePath));

  const res = await fetch(target.url, {
    method: "POST",
    body: form as any,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload falhou: ${res.status} ${res.statusText} - ${text}`);
  }

  /**
   * Para bulkOperationRunMutation, normalmente usa-se o stagedUploadPath
   * derivado do resourceUrl.
   */
  const resourceUrl = target.resourceUrl;
  const marker = "/tmp/";
  const idx = resourceUrl.indexOf(marker);

  if (idx === -1) {
    throw new Error(`Não foi possível derivar stagedUploadPath de resourceUrl: ${resourceUrl}`);
  }

  return resourceUrl.slice(idx);
}

export async function runBulkProductCreate(stagedUploadPath: string) {
  const mutation = `
    mutation bulkOperationRunMutation($mutation: String!, $stagedUploadPath: String!) {
      bulkOperationRunMutation(
        mutation: $mutation,
        stagedUploadPath: $stagedUploadPath
      ) {
        bulkOperation {
          id
          status
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const productCreateMutation = `
    mutation productCreate($product: ProductCreateInput!, $media: [CreateMediaInput!]) {
      productCreate(product: $product, media: $media) {
        product {
          id
          title
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await shopifyAdminFetch<{
    bulkOperationRunMutation: {
      bulkOperation: { id: string; status: string } | null;
      userErrors: { field?: string[]; message: string }[];
    };
  }>(mutation, {
    mutation: productCreateMutation,
    stagedUploadPath,
  });

  const payload = data.bulkOperationRunMutation;

  if (payload.userErrors.length) {
    throw new Error(`bulkOperationRunMutation userErrors: ${JSON.stringify(payload.userErrors)}`);
  }

  return payload.bulkOperation;
}

export async function getCurrentBulkMutationStatus() {
  const query = `
    query {
      currentBulkOperation(type: MUTATION) {
        id
        status
        errorCode
        objectCount
        fileSize
        url
        partialDataUrl
      }
    }
  `;

  const data = await shopifyAdminFetch<{
    currentBulkOperation: {
      id: string;
      status: string;
      errorCode: string | null;
      objectCount: string | null;
      fileSize: string | null;
      url: string | null;
      partialDataUrl: string | null;
    } | null;
  }>(query);

  return data.currentBulkOperation;
}

export async function waitForBulkCompletion(
  intervalMs = 5000,
  timeoutMs = 30 * 60 * 1000
) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const op = await getCurrentBulkMutationStatus();

    if (!op) {
      throw new Error("Nenhuma bulk mutation ativa encontrada.");
    }

    if (op.status === "COMPLETED") {
      return op;
    }

    if (["FAILED", "CANCELED", "CANCELING", "EXPIRED"].includes(op.status)) {
      throw new Error(`Bulk operation terminou com estado ${op.status}. errorCode=${op.errorCode}`);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Timeout à espera da bulk operation.");
}

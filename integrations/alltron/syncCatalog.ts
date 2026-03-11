import fs from "fs";
import path from "path";
import { downloadAlltronFiles } from "./ftpDownload";
import { findDownloadedXmlFile, getXmlPath, readXmlFile } from "./parseXml";
import { normalizeAlltronCatalog } from "./mapToShopify";
import {
  createStagedUploadTarget,
  uploadJsonlToStagedTarget,
  runBulkProductCreate,
  waitForBulkCompletion,
} from "./runBulkImport";
import { buildProductCreateJsonl } from "./buildJsonl";

async function main() {
  console.log("1) Download dos ficheiros Alltron...");
  const downloaded = await downloadAlltronFiles();

  console.log("Ficheiros encontrados:", downloaded.files);

  const productsXmlName = findDownloadedXmlFile(downloaded.files, /artikel.*daten.*\.xml$/i);

  if (!productsXmlName) {
    throw new Error("Não encontrei o ficheiro XML de artigos.");
  }

  console.log("2) Ler XML:", productsXmlName);
  const parsed = readXmlFile(getXmlPath(productsXmlName));

  console.log("3) Normalizar catálogo...");
  const normalized = normalizeAlltronCatalog(parsed);

  console.log(`Produtos normalizados: ${normalized.length}`);

  // Segurança: primeiro teste pequeno
  const batch = normalized.slice(0, 20);

  if (!batch.length) {
    throw new Error("Nenhum produto válido para importar.");
  }

  console.log(`4) Gerar JSONL de teste (${batch.length} produtos)...`);
  const jsonlPath = buildProductCreateJsonl(batch, "products-batch-20.jsonl");

  const stat = fs.statSync(jsonlPath);
  const fileName = path.basename(jsonlPath);

  console.log("5) Criar staged upload...");
  const target = await createStagedUploadTarget(fileName, stat.size);

  console.log("6) Upload JSONL...");
  const stagedUploadPath = await uploadJsonlToStagedTarget(jsonlPath, target);

  console.log("stagedUploadPath:", stagedUploadPath);

  console.log("7) Arrancar bulk import...");
  const bulkOp = await runBulkProductCreate(stagedUploadPath);

  console.log("Bulk criada:", bulkOp);

  console.log("8) Esperar conclusão...");
  const result = await waitForBulkCompletion();

  console.log("Bulk concluída:", result);
}

main().catch((err) => {
  console.error("Erro no syncCatalog:", err);
  process.exit(1);
});

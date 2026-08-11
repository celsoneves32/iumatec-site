import cron from "node-cron";
import { spawn } from "node:child_process";

const RUN_NOW = process.argv.includes("--run-now");
let syncRunning = false;

function run(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`\n▶ ${command} ${args.join(" ")}`);

    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
      shell: true,
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) return resolve();
      reject(new Error(
        signal
          ? `${command} terminou com o sinal ${signal}`
          : `${command} terminou com o código ${code}`,
      ));
    });
  });
}

async function sync() {
  if (syncRunning) {
    console.log("⏭ Sincronização ignorada: a execução anterior ainda está ativa.");
    return;
  }

  syncRunning = true;
  const startedAt = new Date();
  console.log(`\n🔄 Sincronização iniciada: ${startedAt.toLocaleString("pt-PT")}`);

  try {
    // 1. Atualiza preço e stock com os dados atuais do fornecedor.
    await run("npm", ["run", "shopify:sync-price-stock"]);

    // 2. Reconstrói/sincroniza o catálogo que cumpre as regras de venda.
    await run("npm", ["run", "sync:sellable"]);

    // 3. Gera unmatched.json e os restantes relatórios sem alterar IDs.
    await run("node", [
      "integrations/alltron/repair-shopify-ids-supabase-safe-apply-retry.mjs",
    ]);

    // 4. Bloqueia no Supabase apenas os unmatched confirmados pelo relatório.
    // O próprio script recusa aplicar se encontrar mais de 2.000 candidatos.
    await run("node", [
      "integrations/alltron/block-unmatched-shopify-products.mjs",
      "--apply",
    ]);

    const seconds = Math.round((Date.now() - startedAt.getTime()) / 1000);
    console.log(`\n✅ Sincronização concluída em ${seconds}s.`);
  } catch (error) {
    console.error("\n❌ Sincronização interrompida:", error?.message || error);
    process.exitCode = 1;
  } finally {
    syncRunning = false;
  }
}

console.log("🚀 Auto sync iniciado.");
console.log("⏰ Agenda: a cada 2 horas, ao minuto 0.");

cron.schedule("0 */2 * * *", sync, {
  timezone: "Europe/Zurich",
});

if (RUN_NOW) {
  await sync();
}

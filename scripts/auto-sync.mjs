import cron from "node-cron";
import { exec } from "child_process";

function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error("❌ Error:", err);
        reject(err);
      } else {
        console.log(stdout);
        resolve();
      }
    });
  });
}

console.log("🚀 Auto sync started...");

// a cada 2 horas
cron.schedule("0 */2 * * *", async () => {
  console.log("🔄 Running sync...");

  try {
    await run("npm run shopify:sync-price-stock");
    await run("npm run sync:sellable");

    console.log("✅ Sync finished");
  } catch (e) {
    console.error("❌ Sync failed");
  }
});
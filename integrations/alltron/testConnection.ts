import { downloadAlltronFiles } from "./ftpDownload"

async function run() {
  console.log("Starting Alltron FTP test...")
  await downloadAlltronFiles()
}

run().catch((err) => {
  console.error("RUN ERROR:", err)
})
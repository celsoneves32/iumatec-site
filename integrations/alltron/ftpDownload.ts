import * as ftp from "basic-ftp"
import path from "path"
import fs from "fs"
import dotenv from "dotenv"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

export async function downloadAlltronFiles() {
  const host = process.env.ALLTRON_HOST!
  const user = process.env.ALLTRON_USER!
  const password = process.env.ALLTRON_PASS!

  if (!host || !user || !password) {
    throw new Error("Missing ALLTRON_HOST / ALLTRON_USER / ALLTRON_PASS in .env.local")
  }

  const client = new ftp.Client(30000)
  client.ftp.verbose = true

  const downloadDir = path.join(
    process.cwd(),
    "integrations",
    "alltron",
    "downloads"
  )

  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true })
  }

  try {
    console.log("Connecting with explicit FTPS...")

    await client.access({
      host,
      port: 21,
      user,
      password,
      secure: true,
      secureOptions: {
        rejectUnauthorized: false
      }
    })

    console.log("Connected to Alltron FTPS")

    await client.cd("/dataexport")

    const list = await client.list()
    console.log("Files:", list.map((f) => f.name))

    for (const file of list) {
      const localPath = path.join(downloadDir, file.name)
      await client.downloadTo(localPath, file.name)
      console.log("Downloaded:", file.name)
    }
  } catch (err) {
    console.error("FTP ERROR:", err)
  } finally {
    client.close()
  }
}
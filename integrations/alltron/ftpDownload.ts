import ftp from "basic-ftp"
import fs from "fs"

export async function downloadAlltronFiles() {
  const client = new ftp.Client()

  await client.access({
    host: "files.brackalltron.ch",
    user: process.env.ALLTRON_USER,
    password: process.env.ALLTRON_PASS,
    secure: true
  })

  await client.downloadTo(
    "./integrations/alltron/products.xml",
    "/artikeldaten.xml"
  )

  await client.downloadTo(
    "./integrations/alltron/prices.xml",
    "/artikelpreise.xml"
  )

  await client.downloadTo(
    "./integrations/alltron/stock.xml",
    "/lagerbestand.xml"
  )

  client.close()
}

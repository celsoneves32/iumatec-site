import { XMLParser } from "fast-xml-parser"
import fs from "fs"

export function parseProducts() {
  const xml = fs.readFileSync(
    "./integrations/alltron/products.xml",
    "utf8"
  )

  const parser = new XMLParser()
  const data = parser.parse(xml)

  return data
}

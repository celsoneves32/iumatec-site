import fs from "fs"
import path from "path"
import iconv from "iconv-lite"
import { XMLParser } from "fast-xml-parser"

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: true,
  trimValues: true
})

const file = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "downloads",
  "PreisdatenV2.xml"
)

console.log("Reading file:", file)

const buffer = fs.readFileSync(file)
const xml = iconv.decode(buffer, "windows-1252")
const data = parser.parse(xml)

console.log("Top level keys:")
console.log(Object.keys(data))

for (const key of Object.keys(data)) {
  console.log(`\nPreview for key: ${key}`)
  console.dir(data[key], { depth: 3, maxArrayLength: 3 })
}
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
  "ArtikeldatenV2.xml"
)

console.log("Reading file:", file)

const buffer = fs.readFileSync(file)
const xml = iconv.decode(buffer, "windows-1252")
const data = parser.parse(xml)

const items = Array.isArray(data?.items?.item) ? data.items.item : []

console.log("Products found:", items.length)

const preview = items.slice(0, 3).map((p: any) => ({
  sku: p?.part_number?.LITT ?? null,
  ean: p?.part_number?.EITM ?? null,
  title: p?.part_description?.DESC ?? null,
  title2: p?.part_description?.DESC2 ?? null,
  brand: p?.additional_information?.MAFT ?? null,
  stock: p?.additional_information?.STQU ?? null,
  cat1: p?.part_category?.CAT1 ?? null,
  cat2: p?.part_category?.CAT2 ?? null,
  cat3: p?.part_category?.CAT3 ?? null,
  cata: p?.part_category?.CATA ?? null
}))

console.dir(preview, { depth: null })
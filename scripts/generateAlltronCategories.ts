import fs from "fs"
import path from "path"
import iconv from "iconv-lite"
import { XMLParser } from "fast-xml-parser"

type CategoryRow = {
  count: number
  cat1: string
  cat2: string
  cat3: string
  cat4: string
}

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

console.log("Products:", items.length)

function clean(v: unknown): string {
  return String(v ?? "").trim()
}

const counts = new Map<string, CategoryRow>()

for (const item of items) {
  const cat =
    item.part_catagory ||
    item.part_category ||
    item.category ||
    item.item_category ||
    null

  if (!cat) continue

  const cat1 = clean(cat.CAT1)
  const cat2 = clean(cat.CAT2)
  const cat3 = clean(cat.CAT3)
  const cat4 = clean(cat.CATA)

  if (!cat1 && !cat2 && !cat3 && !cat4) continue

  const key = `${cat1} > ${cat2} > ${cat3} > ${cat4}`

  const existing = counts.get(key)

  if (existing) {
    existing.count += 1
  } else {
    counts.set(key, {
      count: 1,
      cat1,
      cat2,
      cat3,
      cat4
    })
  }
}

const sorted = [...counts.values()].sort((a, b) => b.count - a.count)

console.log("Unique category paths:", sorted.length)

console.table(
  sorted.slice(0, 30).map((row) => ({
    count: row.count,
    cat1: row.cat1,
    cat2: row.cat2,
    cat3: row.cat3,
    cat4: row.cat4
  }))
)

const outDir = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "out"
)

fs.mkdirSync(outDir, { recursive: true })

fs.writeFileSync(
  path.join(outDir, "alltron-category-paths.json"),
  JSON.stringify(sorted, null, 2),
  "utf8"
)

console.log("Saved file: integrations/alltron/out/alltron-category-paths.json")
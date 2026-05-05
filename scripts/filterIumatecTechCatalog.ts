import fs from "fs"
import path from "path"

type Product = {
  sku?: string
  fullTitle?: string
  brand?: string
  stock?: number
  price?: number | null
  iumatecCategory?: {
    main?: string
    sub?: string
  }
  rawCategory?: {
    cat1?: string
    cat2?: string
    cat3?: string
    cat4?: string
  }
  images?: string[]
}

const inFile = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "out",
  "iumatec-catalog-filtered.json"
)

const outDir = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "out"
)

const products = JSON.parse(fs.readFileSync(inFile, "utf8")) as Product[]

const allowedMainCategories = new Set([
  "Computer",
  "PC-Komponenten",
  "Peripherie",
  "Netzwerk",
  "Mobile",
  "Datenspeicher",
  "Office & Business",
  "Gaming",
  "Smart Home"
])

const blockedWords = [
  "lego",
  "baby",
  "katzen",
  "hunde",
  "pflanzen",
  "blumentopf",
  "sport",
  "spielwaren",
  "spielzeug",
  "garten"
]

function norm(v: unknown): string {
  return String(v ?? "").trim()
}

const stats = {
  total: products.length,
  missingCategory: 0,
  wrongMainCategory: 0,
  lowPrice: 0,
  noStock: 0,
  blockedWord: 0,
  passed: 0,
  withImages: 0,
  withoutImages: 0
}

const finalCatalog = products.filter((p) => {
  const main = norm(p.iumatecCategory?.main)
  const sub = norm(p.iumatecCategory?.sub)

  if (!main) {
    stats.missingCategory++
    return false
  }

  if (!allowedMainCategories.has(main)) {
    stats.wrongMainCategory++
    return false
  }

  if (!p.price || p.price < 15) {
    stats.lowPrice++
    return false
  }

  if (!p.stock || p.stock <= 0) {
    stats.noStock++
    return false
  }

  const haystack = [
    p.fullTitle,
    p.brand,
    main,
    sub,
    p.rawCategory?.cat1,
    p.rawCategory?.cat2,
    p.rawCategory?.cat3,
    p.rawCategory?.cat4
  ]
    .map(norm)
    .join(" ")
    .toLowerCase()

  for (const word of blockedWords) {
    if (haystack.includes(word)) {
      stats.blockedWord++
      return false
    }
  }

  if (p.images && p.images.length > 0) {
    stats.withImages++
  } else {
    stats.withoutImages++
  }

  stats.passed++
  return true
})

fs.writeFileSync(
  path.join(outDir, "iumatec-tech-catalog.json"),
  JSON.stringify(finalCatalog, null, 2),
  "utf8"
)

console.log("Original filtered:", products.length)
console.log("Stats:", stats)
console.log("Final tech catalog:", finalCatalog.length)
console.log("Saved: integrations/alltron/out/iumatec-tech-catalog.json")
export type CategoryRuleInput = {
  title?: string | null;
  fullTitle?: string | null;
  brand?: string | null;
  description?: string | null;
  description2?: string | null;
  category?: string | null;
  subcategory?: string | null;
  rawCategory?: {
    cat1?: string | null;
    cat2?: string | null;
    cat3?: string | null;
    cat4?: string | null;
  } | null;
};

export type CategoryResult = {
  main: string;
  sub: string;
  priority: number;
  matchedBy: string;
};

type CategoryRule = {
  name: string;
  main: string;
  sub: string;
  priority: number;
  include: RegExp[];
  exclude?: RegExp[];
};

function normalize(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSearchText(product: CategoryRuleInput): string {
  return normalize(
    [
      product.title,
      product.fullTitle,
      product.brand,
      product.description,
      product.description2,
      product.category,
      product.subcategory,
      product.rawCategory?.cat1,
      product.rawCategory?.cat2,
      product.rawCategory?.cat3,
      product.rawCategory?.cat4,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

const RULES: CategoryRule[] = [
  {
    name: "smartphones",
    main: "Mobile",
    sub: "Smartphones",
    priority: 200,
    include: [
      /\bsmartphone\b/i,
      /\bhandy\b/i,
      /\biphone\b/i,
      /\bgalaxy s\d+/i,
      /\bgalaxy a\d+/i,
      /\bgalaxy z\b/i,
      /\bpixel \d+/i,
      /\bredmi note\b/i,
      /\brealme \d+\b/i,
      /\bnothing phone\b/i,
      /\boneplus\b/i,
      /\boppo\b/i,
      /\bhonor \d+\b/i,
    ],
    exclude: [
      /\bcase\b/i,
      /\bhulle\b/i,
      /\bcover\b/i,
      /\bhalterung\b/i,
      /\bdisplay\b/i,
      /\bmonitor\b/i,
      /\btablet\b/i,
      /\bladegerat\b/i,
      /\bkabel\b/i,
      /\badapter\b/i,
    ],
  },
  {
    name: "tablets",
    main: "Mobile",
    sub: "Tablets",
    priority: 195,
    include: [
      /\btablet\b/i,
      /\bipad\b/i,
      /\bgalaxy tab\b/i,
      /\blenovo tab\b/i,
      /\bmatepad\b/i,
      /\bsurface go\b/i,
      /\bsurface pro\b/i,
    ],
    exclude: [
      /\bhalterung\b/i,
      /\bstand\b/i,
      /\bcase\b/i,
      /\bhulle\b/i,
      /\bcover\b/i,
      /\bmount\b/i,
      /\bkabel\b/i,
      /\badapter\b/i,
      /\bmontageset\b/i,
    ],
  },
  {
    name: "studio-audio",
    main: "Peripherie",
    sub: "Audio",
    priority: 192,
    include: [
      /\bstudio monitor\b/i,
      /\bstudio monitore\b/i,
      /\blautsprecher\b/i,
      /\bspeaker\b/i,
      /\baktivlautsprecher\b/i,
      /\bm audio\b/i,
      /\bkrk\b/i,
      /\byamaha hs\b/i,
      /\bpresonus\b/i,
      /\bvonyx\b/i,
      /\bsoundbar\b/i,
    ],
  },
  {
    name: "computer-monitors",
    main: "Peripherie",
    sub: "Monitore",
    priority: 190,
    include: [
      /\bbildschirm\b/i,
      /\bdisplay\b/i,
      /\bmonitor\b/i,
      /\bgaming monitor\b/i,
      /\bcurved gaming\b/i,
      /\boled monitor\b/i,
      /\bultrawide\b/i,
    ],
    exclude: [
      /\bstudio monitor\b/i,
      /\bstudio monitore\b/i,
      /\blautsprecher\b/i,
      /\bspeaker\b/i,
      /\bm audio\b/i,
      /\bkrk\b/i,
      /\bvonyx\b/i,
      /\bmonitor arm\b/i,
      /\bmonitor stand\b/i,
      /\bmonitor halter\b/i,
      /\bmonitorhalter\b/i,
      /\bhalterung\b/i,
      /\bmonta monitor\b/i,
      /\bdockingstation\b/i,
      /\bdock\b/i,
      /\bkvm\b/i,
      /\busb c hub\b/i,
    ],
  },
  {
    name: "monitor-accessories",
    main: "Peripherie",
    sub: "Monitor-Zubehör",
    priority: 188,
    include: [
      /\bmonitor arm\b/i,
      /\bmonitor stand\b/i,
      /\bmonitor halter\b/i,
      /\bmonitorhalter\b/i,
      /\btischhalterung\b/i,
      /\bvesa halter\b/i,
      /\bdisplayhalterung\b/i,
      /\bmonta monitor\b/i,
    ],
  },
  {
    name: "laptops",
    main: "Computer",
    sub: "Laptops",
    priority: 185,
    include: [
      /\blaptop\b/i,
      /\bnotebook\b/i,
      /\bmacbook\b/i,
      /\bthinkpad\b/i,
      /\bvivobook\b/i,
      /\bzenbook\b/i,
      /\bchromebook\b/i,
      /\bprobook\b/i,
      /\belitebook\b/i,
      /\bideapad\b/i,
    ],
    exclude: [
      /\bhalterung\b/i,
      /\bstand\b/i,
      /\bdock\b/i,
      /\bdockingstation\b/i,
      /\btasche\b/i,
      /\bcase\b/i,
      /\bnetzteil\b/i,
    ],
  },
  {
    name: "graphics-cards",
    main: "PC-Komponenten",
    sub: "Grafikkarten",
    priority: 180,
    include: [
      /\bgrafikkarte\b/i,
      /\bgeforce rtx\b/i,
      /\brtx ?\d{4}/i,
      /\bradeon rx\b/i,
      /\brx ?\d{4}/i,
      /\bquadro\b/i,
      /\bnvidia t\d{3,4}\b/i,
    ],
    exclude: [
      /\bhalterung\b/i,
      /\briser\b/i,
      /\bkabel\b/i,
      /\bwaterblock\b/i,
      /\bkuhler\b/i,
    ],
  },
  {
    name: "desktop-pcs",
    main: "Computer",
    sub: "Desktop-PCs",
    priority: 175,
    include: [
      /\bdesktop pc\b/i,
      /\bmini pc\b/i,
      /\bworkstation\b/i,
      /\ball in one\b/i,
      /\bimac\b/i,
      /\bprodesk\b/i,
      /\belitedesk\b/i,
      /\boptiplex\b/i,
      /\bnuc\b/i,
    ],
  },
  {
    name: "ssd",
    main: "Datenspeicher",
    sub: "SSD",
    priority: 170,
    include: [
      /\bssd\b/i,
      /\bnvme\b/i,
      /\bm 2\b/i,
      /\bsata solid state\b/i,
    ],
    exclude: [
      /\bgehause\b/i,
      /\badapter\b/i,
      /\bcase\b/i,
      /\bdockingstation\b/i,
    ],
  },
  {
    name: "network",
    main: "Netzwerk",
    sub: "Netzwerk",
    priority: 165,
    include: [
      /\brouter\b/i,
      /\baccess point\b/i,
      /\bfirewall\b/i,
      /\bmesh wifi\b/i,
      /\bwlan\b/i,
      /\bwi fi\b/i,
      /\bethernet\b/i,
      /\bnetwork\b/i,
    ],
  },
  {
    name: "robot-vacuum",
    main: "Smart Home",
    sub: "Haushalt",
    priority: 160,
    include: [
      /\brobotersauger\b/i,
      /\bsaugroboter\b/i,
      /\brobot vacuum\b/i,
      /\broborock\b/i,
      /\bdreame\b/i,
      /\becovacs\b/i,
    ],
  },
  {
    name: "docking-hubs",
    main: "Peripherie",
    sub: "Docking & Hubs",
    priority: 155,
    include: [
      /\bdockingstation\b/i,
      /\bdocking station\b/i,
      /\busb c hub\b/i,
      /\btype c hub\b/i,
      /\bthunderbolt dock\b/i,
      /\bkvm switch\b/i,
    ],
  },
  {
    name: "gaming",
    main: "Gaming",
    sub: "Gaming",
    priority: 140,
    include: [
      /\bgaming\b/i,
      /\bplaystation\b/i,
      /\bxbox\b/i,
      /\bnintendo switch\b/i,
      /\bcontroller\b/i,
      /\bgamepad\b/i,
    ],
    exclude: [
      /\bgaming monitor\b/i,
      /\bcurved gaming\b/i,
      /\bgaming laptop\b/i,
      /\brtx\b/i,
      /\bradeon rx\b/i,
    ],
  },
];

function matchesRule(text: string, rule: CategoryRule): boolean {
  const included = rule.include.some((pattern) => pattern.test(text));
  if (!included) return false;

  const excluded = rule.exclude?.some((pattern) => pattern.test(text)) ?? false;
  return !excluded;
}

export function classifyProduct(product: CategoryRuleInput): CategoryResult {
  const text = buildSearchText(product);

  for (const rule of [...RULES].sort((a, b) => b.priority - a.priority)) {
    if (matchesRule(text, rule)) {
      return {
        main: rule.main,
        sub: rule.sub,
        priority: rule.priority,
        matchedBy: rule.name,
      };
    }
  }

  return {
    main:
      product.category ||
      product.rawCategory?.cat1 ||
      product.rawCategory?.cat2 ||
      "Sonstiges",
    sub:
      product.subcategory ||
      product.rawCategory?.cat3 ||
      product.rawCategory?.cat4 ||
      "Andere",
    priority: 10,
    matchedBy: "supplier-fallback",
  };
}

export function isProductInCategory(
  product: CategoryRuleInput,
  main: string,
  sub?: string,
): boolean {
  const result = classifyProduct(product);

  if (result.main !== main) return false;
  if (sub && result.sub !== sub) return false;

  return true;
}

export const categoryRules = RULES;

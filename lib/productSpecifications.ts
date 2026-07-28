export type ProductSpecification = {
  label: string;
  value: string;
};

function cleanText(value: unknown) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLabel(value: string) {
  const label = cleanText(value);

  const labelMap: Record<string, string> = {
    auflosung: "Auflösung",
    auflösung: "Auflösung",
    bildschirmdiagonaleinzoll: "Bildschirmdiagonale",
    bildschirmdiagonale: "Bildschirmdiagonale",
    videoanschlusse: "Video-Anschlüsse",
    videoanschlüsse: "Video-Anschlüsse",
    anwendungsbereich: "Anwendungsbereich",
    ergonomie: "Ergonomie",
    curved: "Curved",
    farbe: "Farbe",
    gewicht: "Gewicht",
    speicherkapazitat: "Speicherkapazität",
    speicherkapazität: "Speicherkapazität",
    arbeitsspeicher: "Arbeitsspeicher",
    prozessor: "Prozessor",
    betriebssystem: "Betriebssystem",
    displaygrosse: "Displaygrösse",
    displaygröße: "Displaygrösse",
    schnittstellen: "Schnittstellen",
    anschlusse: "Anschlüsse",
    anschlüsse: "Anschlüsse",
    netzwerk: "Netzwerk",
    wlan: "WLAN",
    bluetooth: "Bluetooth",
    garantie: "Garantie",
  };

  const normalizedKey = label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "");

  return labelMap[normalizedKey] || label;
}

export function parseProductSpecifications(
  description?: string | null,
): ProductSpecification[] {
  const text = cleanText(description);

  if (!text) {
    return [];
  }

  const pieces = text
    .split(/,\s*(?=[^,:]{2,50}:)/)
    .map((piece) => piece.trim())
    .filter(Boolean);

  const specifications: ProductSpecification[] = [];

  for (const piece of pieces) {
    const separatorIndex = piece.indexOf(":");

    if (separatorIndex === -1) {
      continue;
    }

    const rawLabel = piece.slice(0, separatorIndex);
    const rawValue = piece.slice(separatorIndex + 1);

    const label = normalizeLabel(rawLabel);
    const value = cleanText(rawValue);

    if (!label || !value) {
      continue;
    }

    specifications.push({
      label,
      value,
    });
  }

  const uniqueSpecifications = new Map<string, ProductSpecification>();

  for (const specification of specifications) {
    const key = specification.label.toLowerCase();

    if (!uniqueSpecifications.has(key)) {
      uniqueSpecifications.set(key, specification);
    }
  }

  return Array.from(uniqueSpecifications.values());
}
/**
 * IUMATEC TV & Home Cinema storefront view.
 * Read-only classification of the existing Smart Home > TV & Home Cinema pool.
 * It never changes Supabase or Shopify and intentionally omits ambiguous items.
 */
export const TV_HOME_AREAS = [
  { key: "fernseher", label: "Fernseher", subtitle: "Smart TVs, QLED, OLED und LED" },
  { key: "soundbars", label: "Soundbars", subtitle: "Klarer Klang für dein TV-Erlebnis" },
  { key: "heimkino", label: "Heimkino", subtitle: "Surround, Receiver und Streaming" },
  { key: "tv-zubehoer", label: "TV-Zubehör", subtitle: "Halterungen, Fernbedienungen und Kabel" },
] as const;

export type TVHomeArea = (typeof TV_HOME_AREAS)[number]["key"];

export function isTVHomeArea(value: string): value is TVHomeArea {
  return TV_HOME_AREAS.some((area) => area.key === value);
}

export function classifyTVHomeProduct(product: { title?: string | null; sku?: string | null }): TVHomeArea | null {
  const title = String(product.title || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const sku = String(product.sku || "").trim().toUpperCase();

  // Check accessories first. A TV remote should never be listed as a TV.
  const accessoryWord = /(?:adapter|stecker|kupplung|kabel|cable|fernbe(?:dienung|dieung)|remote|wandhalter|halterung|tv[- ]?halter|halter|lnb|antenne|satelliten|netzteil|dongle|ersatz|schutzhaube|sicherung|reinigung|f-buchse|splitter|verteiler|mount|halterungsset)/i;
  if (accessoryWord.test(title) || /^(?:TVZ\b|VI SAT\b|AX TV\b|VI ZUB\b|MM FE\b|SMA FE\b|MM ZUB\b)/.test(sku)) {
    return "tv-zubehoer";
  }

  // The supplier's real television SKUs use the TV prefix; never classify PC monitors.
  if (/^TV\s+/.test(sku) && /(?:\btv\b|\bfernseher\b|\bqled\b|\boled\b|\bled-tv\b)/.test(title)) {
    return "fernseher";
  }

  if (/\bsoundbar\b/.test(title) || /^SMA SB\s/.test(sku)) {
    return "soundbars";
  }

  if (/(?:heimkino|home theatre|home theater|home cinema|front surround|surround(?: system)?|subwoofer|av[- ]receiver|set[- ]top box|streaming box|blu[- ]ray|iptv set[- ]top|kino system)/.test(title)) {
    return "heimkino";
  }

  // Ambiguous and non-TV items are excluded, not silently reclassified.
  return null;
}

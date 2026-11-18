"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  type LucideIcon, ArrowLeft, ArrowRight, CheckCircle2, CircleHelp, ClipboardList, CreditCard,
  FileText, Headphones, MapPin, Package, RefreshCw, ShieldCheck, Truck,
} from "lucide-react";

type Money = { amount: string; currencyCode: string } | null;
type Address = {
  name?: string | null; address1?: string | null; address2?: string | null;
  zip?: string | null; city?: string | null; country?: string | null;
  phoneNumber?: string | null;
} | null;
type Product = {
  id: string; title: string; variantTitle?: string | null; quantity: number;
  image?: { url: string; altText?: string | null } | null;
  totalPrice?: Money;
};
type Schedule = { id: string; completed: boolean; dueAt?: string | null; totalBalance: Money };
type Payment = {
  paymentStatus?: string | null; totalPaidAmount: Money; totalOutstandingAmount: Money;
  paymentCollectionUrl?: string | null;
  paymentTerms?: {
    paymentTermsName: string; nextDueAt?: string | null;
    paymentSchedules?: { nodes: Schedule[] } | null;
  } | null;
} | null;
type Order = {
  id: string; name: string; processedAt: string;
  financialStatus?: string | null; fulfillmentStatus?: string | null;
  statusPageUrl?: string | null; subtotal?: Money; totalPrice: Money;
  totalShipping?: Money; totalTax?: Money; totalRefunded?: Money;
  shippingLine?: { title?: string | null } | null;
  shippingAddress?: Address; billingAddress?: Address;
  paymentInformation?: Payment;
  lineItems?: { nodes: Product[] } | null;
  fulfillments?: { nodes: Array<{
    id: string; status?: string | null; updatedAt: string;
    trackingInformation?: Array<{ company?: string | null; number?: string | null; url?: string | null }>;
  }> } | null;
};
type StateError = "not_authenticated" | "session_expired" | "not_found" | "other";
const orderEndpoint = "/api/konto/bestellungen";

function currency(value: Money): string {
  if (!value) return "–";
  const number = Number(value.amount);
  if (!Number.isFinite(number)) return "–";
  try { return new Intl.NumberFormat("de-CH", { style: "currency", currency: value.currencyCode }).format(number); }
  catch { return `${number.toFixed(2)} ${value.currencyCode || "CHF"}`; }
}
function date(value?: string | null): string {
  if (!value) return "–";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "–";
  return new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}
function external(url?: string | null): string | null {
  if (!url) return null;
  try { const parsed = new URL(url); return parsed.protocol === "https:" ? parsed.toString() : null; }
  catch { return null; }
}
function paymentLabel(value?: string | null): string {
  const key = (value || "").toUpperCase();
  if (key.includes("PARTIAL")) return "Teilweise bezahlt";
  if (key.includes("PAID")) return "Bezahlt";
  if (key.includes("PENDING") || key.includes("AUTHORIZED")) return "Zahlung ausstehend";
  if (key.includes("REFUND")) return "Rückerstattung";
  if (key.includes("VOID") || key.includes("EXPIRED")) return "Nicht bezahlt";
  return "Zahlungsstatus prüfen";
}
function deliveryLabel(value?: string | null): string {
  switch ((value || "").toUpperCase()) {
    case "FULFILLED": return "Versendet";
    case "PARTIALLY_FULFILLED": return "Teilweise versendet";
    case "UNFULFILLED": return "In Bearbeitung";
    case "ON_HOLD": return "Zurückgestellt";
    default: return "Lieferstatus prüfen";
  }
}
function statusTone(value?: string | null): string {
  return (value || "").toUpperCase() === "FULFILLED"
    ? "bg-emerald-50 text-emerald-800 ring-emerald-100"
    : "bg-amber-50 text-amber-800 ring-amber-100";
}
function AddressBlock({ label, address }: { label: string; address?: Address }) {
  return <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-4">
    <div className="mb-3 text-xs font-bold uppercase tracking-wide text-neutral-500">{label}</div>
    {address ? <address className="space-y-1 not-italic text-sm leading-6 text-neutral-900">
      {address.name && <div className="font-semibold">{address.name}</div>}
      {address.address1 && <div>{address.address1}</div>}
      {address.address2 && <div>{address.address2}</div>}
      {(address.zip || address.city) && <div>{address.zip} {address.city}</div>}
      {address.country && <div>{address.country}</div>}
      {address.phoneNumber && <div className="pt-2 text-neutral-600">{address.phoneNumber}</div>}
    </address> : <p className="text-sm text-neutral-500">Keine Adresse hinterlegt.</p>}
  </div>;
}
function ProductRow({ item }: { item: Product }) {
  const picture = external(item.image?.url);
  return <div className="flex gap-4 border-b border-neutral-100 py-5 last:border-0">
    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
      {picture ? <img src={picture} alt={item.image?.altText || item.title} loading="lazy" className="h-full w-full object-contain p-1"/> : <Package size={26} className="text-neutral-400"/>}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-bold text-neutral-950">{item.title}</p>
      {item.variantTitle && item.variantTitle !== "Default Title" && <p className="mt-1 text-xs text-neutral-500">{item.variantTitle}</p>}
      <p className="mt-2 text-xs text-neutral-500">Menge: {item.quantity}</p>
    </div>
    <div className="shrink-0 text-right text-sm font-bold text-neutral-950">{currency(item.totalPrice)}</div>
  </div>;
}
function Section({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return <section className="rounded-2xl border border-neutral-200 bg-white px-5 py-5 shadow-sm sm:px-7 sm:py-7">
    <h2 className="mb-5 flex items-center gap-2 text-xl font-black text-neutral-950"><Icon size={20} className="text-red-700"/>{title}</h2>
    {children}
  </section>;
}
function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-14 text-center shadow-sm">
    <Package size={38} className="mx-auto text-neutral-400"/>
    <h2 className="mt-4 text-xl font-black">{title}</h2>
    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-neutral-600">{children}</p>
  </div>;
}
export default function KontoOrdersClient() {
  const [selected, setSelected] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [detail, setDetail] = useState<Order | null>(null);
  const [limited, setLimited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<StateError | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [moreBusy, setMoreBusy] = useState(false);

  useEffect(() => {
    const refreshSelection = () => setSelected(new URLSearchParams(window.location.search).get("id"));
    refreshSelection();
    window.addEventListener("popstate", refreshSelection);
    return () => window.removeEventListener("popstate", refreshSelection);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(null);
    const url = selected ? `${orderEndpoint}?id=${encodeURIComponent(selected)}` : orderEndpoint;
    fetch(url, { cache: "no-store", credentials: "same-origin" })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "other");
        return data;
      })
      .then(data => {
        if (!active) return;
        if (selected) { setDetail(data.order || null); setLimited(Boolean(data.limited)); }
        else {
          setOrders(Array.isArray(data.orders) ? data.orders : []);
          setCursor(data.endCursor || null); setHasMore(Boolean(data.hasNextPage));
        }
      })
      .catch(e => {
        if (!active) return;
        const message = e instanceof Error ? e.message : "other";
        setError(message === "not_authenticated" || message === "session_expired" || message === "not_found" ? message : "other");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selected]);

  function navigate(id: string | null) {
    const target = id ? `/konto/bestellungen?id=${encodeURIComponent(id)}` : "/konto/bestellungen";
    window.history.pushState({}, "", target);
    setSelected(id); setDetail(null); setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function more() {
    if (!cursor || moreBusy) return;
    setMoreBusy(true);
    try {
      const response = await fetch(`${orderEndpoint}?after=${encodeURIComponent(cursor)}`, { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) throw new Error("loading_failed");
      const data = await response.json();
      setOrders(current => {
        const ids = new Set(current.map(o => o.id));
        return [...current, ...(data.orders as Order[]).filter(o => !ids.has(o.id))];
      });
      setCursor(data.endCursor || null); setHasMore(Boolean(data.hasNextPage));
    } catch { setError("other"); }
    finally { setMoreBusy(false); }
  }

  const order = detail;
  const terms = order?.paymentInformation?.paymentTerms;
  const schedules = terms?.paymentSchedules?.nodes || [];
  const fulfillments = order?.fulfillments?.nodes || [];
  const tracking = fulfillments.flatMap(f => f.trackingInformation || []).filter(t => external(t.url));
  const orderUrl = external(order?.statusPageUrl);
  const payUrl = external(order?.paymentInformation?.paymentCollectionUrl);
  const subject = encodeURIComponent(`Anfrage zur Bestellung ${order?.name || ""}`);

  return <main className="min-h-screen bg-[#f7f7f8] px-4 py-9 text-neutral-950 sm:py-12">
    <div className="mx-auto max-w-6xl">
      <nav aria-label="Breadcrumb" className="mb-7 flex items-center gap-2 text-xs font-semibold text-neutral-500">
        <Link href="/" className="hover:text-red-700">Startseite</Link> / <Link href="/konto" className="hover:text-red-700">Mein Konto</Link> / <button onClick={() => navigate(null)} className="text-neutral-900 hover:text-red-700">Bestellungen</button>
      </nav>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-xs font-black text-red-800"><ShieldCheck size={15}/> IUMATEC Kundenbereich</div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{selected && order ? `${order.name} – Bestelldetails` : "Meine Bestellungen"}</h1>
          <p className="mt-2 text-sm text-neutral-600">Deine Einkäufe, Lieferung, Zahlungsübersicht und Dokumente an einem Ort.</p>
        </div>
        <Link href="/konto" className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-bold hover:border-red-200"><ArrowLeft size={16}/> Mein Konto</Link>
      </div>

      {loading && <div role="status" className="rounded-2xl border border-neutral-200 bg-white p-10 text-center text-sm text-neutral-600"><RefreshCw size={22} className="mx-auto mb-3 animate-spin"/> Bestellungen werden geladen …</div>}
      {!loading && error && <EmptyState title={error === "not_authenticated" || error === "session_expired" ? "Bitte anmelden" : error === "not_found" ? "Bestellung nicht gefunden" : "Bestellungen derzeit nicht verfügbar"}>
        {error === "not_authenticated" || error === "session_expired" ? <>Melde dich an, um ausschliesslich deine Bestellungen zu sehen. <Link href="/konto" className="font-bold text-red-700 underline">Zur Anmeldung</Link></> : <>Bitte versuche es später erneut. Wenn der Fehler bestehen bleibt, kontaktiere <a href="mailto:support@iumatec.ch" className="font-bold text-red-700 underline">unseren Kundendienst</a>.</>}
      </EmptyState>}

      {!loading && !error && !selected && <>
        {orders.length === 0 ? <EmptyState title="Noch keine Bestellungen">Sobald du bei IUMATEC etwas bestellst, erscheint deine Bestellung hier.</EmptyState> :
          <div className="space-y-4">{orders.map(o => <article key={o.id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 bg-neutral-50 px-5 py-4 sm:px-7">
              <div><p className="text-base font-black">{o.name}</p><p className="mt-1 text-xs text-neutral-500">Bestellt am {date(o.processedAt)}</p></div>
              <div className="flex flex-wrap gap-2"><span className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${statusTone(o.fulfillmentStatus)}`}>{deliveryLabel(o.fulfillmentStatus)}</span><span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-neutral-700 ring-1 ring-neutral-200">{paymentLabel(o.financialStatus)}</span></div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-5 px-5 py-5 sm:px-7">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
                  {external(o.lineItems?.nodes?.[0]?.image?.url) ? <img className="h-full w-full object-contain p-1" src={external(o.lineItems?.nodes?.[0]?.image?.url) || ""} alt={o.lineItems?.nodes?.[0]?.title || "Produkt"} loading="lazy"/> : <Package className="text-neutral-400"/>}
                </div>
                <div className="min-w-0"><p className="line-clamp-2 text-sm font-bold">{o.lineItems?.nodes?.[0]?.title || "Bestellung"}</p><p className="mt-1 text-xs text-neutral-500">{o.lineItems?.nodes?.length && o.lineItems.nodes.length > 1 ? `und weitere Artikel` : ""}</p></div>
              </div>
              <div className="text-right"><p className="text-xl font-black">{currency(o.totalPrice)}</p><button onClick={() => navigate(o.id)} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#bd3e2b] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#9d3022]">Details ansehen <ArrowRight size={16}/></button></div>
            </div>
          </article>)}</div>}
        {hasMore && <div className="mt-6 text-center"><button disabled={moreBusy} onClick={more} className="rounded-xl border border-neutral-300 bg-white px-6 py-3 text-sm font-bold hover:bg-neutral-50 disabled:opacity-50">{moreBusy ? "Lädt …" : "Weitere Bestellungen anzeigen"}</button></div>}
      </>}

      {!loading && !error && selected && order && <>
        <button onClick={() => navigate(null)} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-red-700 hover:underline"><ArrowLeft size={16}/> Zur Bestellübersicht</button>
        {limited && <div role="status" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Einige Details sind für diese Bestellung noch nicht verfügbar. Die sicheren Basisdaten werden angezeigt.</div>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Bestellung", value: `${order.name} · ${date(order.processedAt)}` },
            { title: "Lieferung", value: deliveryLabel(order.fulfillmentStatus) },
            { title: "Zahlung", value: paymentLabel(order.paymentInformation?.paymentStatus || order.financialStatus) },
            { title: "Gesamtbetrag", value: currency(order.totalPrice) },
          ].map(card => <div key={card.title} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-neutral-500">{card.title}</p><p className="mt-2 text-base font-black leading-6">{card.value}</p></div>)}
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-5">
            <Section title="Bestellte Produkte" icon={Package}>
              {order.lineItems?.nodes?.length ? order.lineItems.nodes.map(item => <ProductRow key={item.id} item={item}/>) : <p className="text-sm text-neutral-600">Für diese Bestellung sind derzeit keine Positionen verfügbar.</p>}
              <div className="mt-4 space-y-2 border-t border-neutral-200 pt-4 text-sm">
                {order.subtotal && <div className="flex justify-between gap-3"><span className="text-neutral-600">Zwischensumme</span><strong>{currency(order.subtotal)}</strong></div>}
                {order.totalShipping && <div className="flex justify-between gap-3"><span className="text-neutral-600">Versand</span><strong>{currency(order.totalShipping)}</strong></div>}
                {order.totalTax && <div className="flex justify-between gap-3"><span className="text-neutral-600">MwSt. (im Gesamtbetrag enthalten)</span><strong>{currency(order.totalTax)}</strong></div>}
                <div className="flex justify-between gap-3 border-t border-neutral-200 pt-3 text-lg font-black"><span>Gesamt</span><span>{currency(order.totalPrice)}</span></div>
                {order.totalRefunded && Number(order.totalRefunded.amount) > 0 && <div className="flex justify-between gap-3 text-sm text-neutral-600"><span>Erstattet</span><span>{currency(order.totalRefunded)}</span></div>}
              </div>
            </Section>
            <Section title="Versand & Lieferdetails" icon={Truck}>
              <p className="mb-4 text-sm text-neutral-700">{order.shippingLine?.title ? `Versandart: ${order.shippingLine.title}` : "Details zur Lieferung"}</p>
              <AddressBlock label="Lieferadresse" address={order.shippingAddress}/>
              {fulfillments.length > 0 && <div className="mt-5 space-y-3">{fulfillments.map(f => <div key={f.id} className="rounded-xl border border-neutral-200 p-4 text-sm"><p className="font-bold">Sendungsstatus: {f.status || "Verfügbar"}</p><p className="mt-1 text-xs text-neutral-500">Zuletzt aktualisiert: {date(f.updatedAt)}</p>{(f.trackingInformation || []).map((t, i) => <div key={`${f.id}-${i}`} className="mt-3 flex flex-wrap items-center justify-between gap-3"><span className="text-neutral-600">{t.company || "Tracking"} {t.number || ""}</span>{external(t.url) && <a href={external(t.url)!} target="_blank" rel="noopener noreferrer" className="font-bold text-red-700 underline">Sendung verfolgen</a>}</div>)}</div>)}</div>}
              {tracking.length === 0 && orderUrl && <a href={orderUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-red-700 underline">Bestellstatus prüfen <ArrowRight size={16}/></a>}
              {!orderUrl && tracking.length === 0 && <p className="mt-3 text-xs text-neutral-500">Noch kein Tracking-Link verfügbar.</p>}
            </Section>
            <Section title="Dokumente & Reklamationen" icon={FileText}>
              <p className="mb-4 text-sm leading-6 text-neutral-600">Bestellbestätigung, Rechnungsanfragen sowie Rückgabe- und Garantiefragen.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {orderUrl && <a href={orderUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 p-4 text-sm font-bold hover:border-red-300"><span>Bestellstatus öffnen</span><ArrowRight size={16}/></a>}
                <a href={`mailto:support@iumatec.ch?subject=${subject}`} className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 p-4 text-sm font-bold hover:border-red-300"><span>Rechnung / Beleg anfragen</span><ArrowRight size={16}/></a>
                <Link href="/retouren" className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 p-4 text-sm font-bold hover:border-red-300"><span>Retouren & Garantie</span><ArrowRight size={16}/></Link>
                <Link href="/kontakt" className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 p-4 text-sm font-bold hover:border-red-300"><span>Problem melden</span><ArrowRight size={16}/></Link>
              </div>
              <p className="mt-3 text-xs text-neutral-500">PDF-Rechnungen werden hier erst als direkter Download angeboten, wenn ein verifiziertes Rechnungssystem angebunden ist.</p>
            </Section>
          </div>
          <div className="space-y-5">
            <Section title="Zahlungsübersicht" icon={CreditCard}>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-4"><span className="text-neutral-600">Bestellwert</span><strong>{currency(order.totalPrice)}</strong></div>
                {order.paymentInformation ? <>
                  <div className="flex justify-between gap-4"><span className="text-neutral-600">Bei IUMATEC bezahlt</span><strong>{currency(order.paymentInformation.totalPaidAmount)}</strong></div>
                  <div className="flex justify-between gap-4 border-t border-neutral-200 pt-3"><span className="font-bold">Offen bei IUMATEC</span><strong>{currency(order.paymentInformation.totalOutstandingAmount)}</strong></div>
                </> : <p className="text-neutral-500">Keine weiteren Zahlungsangaben verfügbar.</p>}
              </div>
              {payUrl && <a href={payUrl} target="_blank" rel="noopener noreferrer" className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-[#bd3e2b] px-4 py-3 text-sm font-bold text-white hover:bg-[#9d3022]">Zahlungsseite öffnen <ArrowRight size={16}/></a>}
              <p className="mt-4 text-xs leading-5 text-neutral-500">Bei Klarna oder einem anderen Ratenanbieter kann dessen offener Saldo vom Shopify-Zahlungsstatus abweichen. Massgeblich ist der Vertrag beim Anbieter.</p>
            </Section>
            <Section title="Raten & Zahlungsfristen" icon={ClipboardList}>
              {terms ? <>
                <p className="text-sm font-bold">{terms.paymentTermsName}</p>
                {terms.nextDueAt && <p className="mt-1 text-xs text-neutral-600">Nächster Termin: {date(terms.nextDueAt)}</p>}
                {schedules.length > 0 ? <div className="mt-4 divide-y divide-neutral-100">{schedules.map((s, i) => <div key={s.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-3 text-xs"><span className={`flex h-8 w-8 items-center justify-center rounded-full ${s.completed ? "bg-green-50 text-green-700" : "bg-neutral-100 text-neutral-700"}`}>{s.completed ? <CheckCircle2 size={17}/> : i+1}</span><span>{s.completed ? "Abgeschlossen" : "Offene Zahlungsfrist"}<span className="block text-neutral-500">{date(s.dueAt)}</span></span><strong title="Offener Saldo dieser Zahlungsfrist">{currency(s.totalBalance)}</strong></div>)}</div> : <p className="mt-3 text-sm text-neutral-500">Kein einzelner Ratenkalender von Shopify verfügbar.</p>}
              </> : <p className="text-sm leading-6 text-neutral-600">Falls du Ratenzahlung gewählt hast, findest du den verbindlichen Ratenplan direkt bei deinem Zahlungsanbieter.</p>}
              <p className="mt-4 text-xs leading-5 text-neutral-500">Es werden keine Raten oder Fälligkeiten geschätzt. Nur bestätigte Zahlungsdaten werden angezeigt.</p>
            </Section>
            <Section title="Rechnungsadresse" icon={MapPin}><AddressBlock label="Rechnungsadresse" address={order.billingAddress}/></Section>
            <div className="rounded-2xl bg-neutral-950 p-6 text-white"><div className="flex items-center gap-2"><Headphones size={21} className="text-red-300"/><strong>Fragen zur Bestellung?</strong></div><p className="mt-2 text-sm leading-6 text-neutral-300">Unser IUMATEC Kundenservice hilft bei Lieferung, Rechnung und Rückgabe.</p><a href={`mailto:support@iumatec.ch?subject=${subject}`} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-neutral-950 hover:bg-neutral-100">Kundenservice kontaktieren <ArrowRight size={16}/></a></div>
          </div>
        </div>
      </>}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-6 text-xs text-neutral-500"><span className="flex items-center gap-2"><ShieldCheck size={16}/> Geschützter Kundenbereich · Schweiz</span><Link href="/faq" className="flex items-center gap-2 font-semibold hover:text-red-700"><CircleHelp size={16}/> Hilfe & FAQ</Link></div>
    </div>
  </main>;
}

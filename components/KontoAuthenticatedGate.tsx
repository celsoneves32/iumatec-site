"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight, ChevronDown, CircleHelp, Heart, LogOut, MapPin,
  Package, RotateCcw, ShieldCheck, Truck, UserRound,
} from "lucide-react";

type AuthState = { authenticated: boolean; displayName?: string | null };
type MenuItem = { label: string; description: string; href: string };

const accountSetting = process.env.NEXT_PUBLIC_SHOPIFY_CUSTOMER_ACCOUNTS_URL || "https://account.iumatec.ch";
const shopifyAccount = (() => {
  try {
    const url = new URL(accountSetting);
    return url.protocol === "https:" ? url.origin : "https://account.iumatec.ch";
  } catch {
    return "https://account.iumatec.ch";
  }
})();

const sections = [
  {
    id: "orders", title: "Bestellungen & Rechnungen", description: "Einkäufe, Lieferstatus und Belege", icon: Package,
    items: [
      { label: "Meine Bestellungen", description: "Bestellungen im sicheren Shopify-Kundenkonto ansehen", href: `${shopifyAccount}/orders` },
      { label: "Lieferstatus prüfen", description: "Eine Bestellung und verfügbare Sendungsinformationen öffnen", href: `${shopifyAccount}/orders` },
      { label: "Rechnung oder Beleg anfragen", description: "Belege beim IUMATEC-Kundendienst anfordern", href: "/kontakt" },
    ],
  },
  {
    id: "profile", title: "Mein Profil & Einstellungen", description: "Persönliche Daten und Lieferadressen", icon: UserRound,
    items: [
      { label: "Persönliche Daten", description: "Profil im sicheren Shopify-Kundenkonto verwalten", href: shopifyAccount },
      { label: "Lieferadressen", description: "Gespeicherte Adressen im Shopify-Kundenkonto verwalten", href: shopifyAccount },
      { label: "Kontosicherheit", description: "Zugang und Kontoeinstellungen bei Shopify verwalten", href: shopifyAccount },
    ],
  },
  {
    id: "returns", title: "Retouren & Probleme", description: "Rückgaben, Garantie und Reklamationen", icon: RotateCcw,
    items: [
      { label: "Rückgabe & Garantie", description: "Rückgabebedingungen und Garantiehinweise lesen", href: "/retouren" },
      { label: "Ein Problem melden", description: "Unseren Kundendienst zu einer Bestellung kontaktieren", href: "/kontakt" },
    ],
  },
  {
    id: "wishlist", title: "Merkliste & Vergleichen", description: "Produkte für später speichern und vergleichen", icon: Heart,
    items: [
      { label: "Meine Merkliste", description: "Auf diesem Gerät gespeicherte Produkte ansehen", href: "/merken" },
      { label: "Produkte vergleichen", description: "Ausgewählte Produkte direkt vergleichen", href: "/compare" },
    ],
  },
  {
    id: "help", title: "Hilfe & Kundenservice", description: "Antworten, Versand und persönlicher Kontakt", icon: CircleHelp,
    items: [
      { label: "Kundendienst kontaktieren", description: "Fragen zu Produkten oder Bestellungen stellen", href: "/kontakt" },
      { label: "Versand & Lieferung", description: "Versandkosten und Lieferbedingungen ansehen", href: "/versand" },
      { label: "Häufige Fragen (FAQ)", description: "Antworten zu Bestellungen, Zahlungen und Rückgaben", href: "/faq" },
    ],
  },
];

function AccountLink({ item }: { item: MenuItem }) {
  const classes = "group flex items-center justify-between gap-4 border-b border-neutral-100 px-5 py-4 transition hover:bg-neutral-50 last:border-b-0 sm:px-8";
  const content = <>
    <span className="min-w-0"><strong className="block text-[14px] text-neutral-900">{item.label}</strong><span className="mt-1 block text-[12px] leading-5 text-neutral-500">{item.description}</span></span>
    <ArrowRight size={17} className="shrink-0 text-neutral-400 group-hover:text-red-600" />
  </>;
  return item.href.startsWith("/")
    ? <Link href={item.href} className={classes}>{content}</Link>
    : <a href={item.href} className={classes}>{content}</a>;
}

export default function KontoAuthenticatedGate({ guest }: { guest: ReactNode }) {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(false);
  const [expanded, setExpanded] = useState<string[]>(["orders", "profile"]);

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("auth");
    setNotice(Boolean(result && result !== "ok"));
    let active = true;
    fetch("/api/auth/shopify/session", { credentials: "same-origin", cache: "no-store" })
      .then(r => r.ok ? r.json() : { authenticated: false })
      .then(data => { if (active) setAuth(data); })
      .catch(() => { if (active) setAuth({ authenticated: false }); });
    return () => { active = false; };
  }, []);

  async function logout() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/auth/shopify/logout", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      window.location.assign(res.ok && typeof data.logoutUrl === "string" ? data.logoutUrl : "/konto");
    } catch { setBusy(false); }
  }

  if (!auth) return <main className="mx-auto max-w-5xl px-5 py-20 text-center text-neutral-600">Kundenkonto wird geladen …</main>;
  if (!auth.authenticated) return <>
    {notice && <p role="alert" className="mx-auto mt-4 max-w-5xl rounded-xl border border-amber-300 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-900">Die Anmeldung konnte nicht abgeschlossen werden. Bitte versuche es erneut oder kontaktiere unseren Support.</p>}
    {guest}
  </>;

  function toggle(id: string) {
    setExpanded(items => items.includes(id) ? items.filter(item => item !== id) : [...items, id]);
  }

  const quick = [
    { label: "Bestellungen", description: "Bestellübersicht öffnen", icon: Package, href: `${shopifyAccount}/orders` },
    { label: "Mein Profil", description: "Persönliche Daten verwalten", icon: MapPin, href: shopifyAccount },
    { label: "Merkliste", description: "Gespeicherte Artikel", icon: Heart, href: "/merken" },
  ];

  return (
    <main className="min-h-screen bg-[#f7f7f8] px-4 py-10 text-neutral-900 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[26px] border border-neutral-200 bg-white px-6 py-8 shadow-sm sm:px-10 sm:py-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-xs font-bold text-green-800"><ShieldCheck size={16} /> Sicher angemeldet</span>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{auth.displayName ? `Hallo ${auth.displayName}` : "Mein Kundenkonto"}</h1>
              <p className="mt-2 text-sm text-neutral-600">Willkommen zurück bei IUMATEC. Verwalte deine Bestellungen und Kundendaten.</p>
            </div>
            <button type="button" onClick={logout} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 px-4 py-3 text-sm font-bold hover:bg-neutral-50 disabled:opacity-50"><LogOut size={17} /> Abmelden</button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {quick.map(({ label, description, icon: Icon, href }) => {
            const inner = <><span className="rounded-xl bg-red-50 p-3 text-red-700"><Icon size={22}/></span><span className="min-w-0 flex-1"><strong className="block text-sm font-black">{label}</strong><span className="mt-1 block text-xs text-neutral-500">{description}</span></span><ArrowRight className="text-neutral-400" size={17}/></>;
            const css = "flex min-h-24 items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-5 shadow-sm transition hover:border-red-200 hover:shadow-md";
            return href.startsWith("/") ? <Link key={label} href={href} className={css}>{inner}</Link> : <a key={label} href={href} className={css}>{inner}</a>;
          })}
        </div>

        <div className="mb-4 mt-9 flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-black">Alle Konto-Optionen</h2><p className="text-xs text-neutral-500">Bereiche anklicken, um Optionen zu öffnen</p></div>
        <div className="space-y-4">
          {sections.map(({ id, title, description, icon: Icon, items }) => {
            const isOpen = expanded.includes(id);
            return <section key={id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <button type="button" onClick={() => toggle(id)} aria-expanded={isOpen} aria-controls={`konto-section-${id}`} className="flex w-full items-center gap-4 px-5 py-6 text-left hover:bg-neutral-50 sm:px-7">
                <span className="rounded-xl bg-red-50 p-3 text-red-700"><Icon size={22}/></span>
                <span className="min-w-0 flex-1"><strong className="block text-lg font-black">{title}</strong><span className="mt-1 block text-sm text-neutral-600">{description}</span></span>
                <ChevronDown size={19} className={`shrink-0 text-neutral-500 transition ${isOpen ? "rotate-180" : ""}`}/>
              </button>
              {isOpen && <div id={`konto-section-${id}`} className="border-t border-neutral-100">{items.map(item => <AccountLink key={item.label} item={item}/>)}</div>}
            </section>;
          })}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-5 text-sm">
          <span className="flex items-center gap-3"><Truck className="text-neutral-500" size={22}/><span><strong className="block">IUMATEC Schweiz</strong><span className="block text-xs text-neutral-500">Lieferung ausschliesslich innerhalb der Schweiz</span></span></span>
          <a href="mailto:support@iumatec.ch" className="font-bold text-red-700 hover:underline">support@iumatec.ch</a>
        </div>
        <p className="mt-5 text-center text-xs leading-5 text-neutral-500">Anmeldung und Kundenprofil werden sicher über Shopify verwaltet. Retouren und Beleganfragen bearbeitet der IUMATEC-Kundendienst.</p>
      </div>
    </main>
  );
}

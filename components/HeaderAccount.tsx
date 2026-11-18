"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, CircleHelp, LogOut, MapPin, Package, UserRound } from "lucide-react";

type Auth = { authenticated: boolean; displayName?: string | null };
// Customer pages live on account.iumatec.ch, never on shop.iumatec.ch.
const account = "https://account.iumatec.ch";
export default function HeaderAccount() {
  const [open, setOpen] = useState(false);
  const [auth, setAuth] = useState<Auth | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    let active = true;
    fetch("/api/auth/shopify/session", { cache: "no-store", credentials: "same-origin" })
      .then(r => r.ok ? r.json() : { authenticated: false })
      .then(data => { if (active) setAuth(data); })
      .catch(() => { if (active) setAuth({ authenticated: false }); });
    return () => { active = false; };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    function outside(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    function escape(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  function login(e: FormEvent) {
    e.preventDefault();
    const query = email.trim() ? `?email=${encodeURIComponent(email.trim())}` : "";
    window.location.assign(`/api/auth/shopify/login${query}`);
  }
  async function logout() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/auth/shopify/logout", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" } });
      const data = await res.json();
      window.location.assign(res.ok && typeof data.logoutUrl === "string" ? data.logoutUrl : "/konto");
    } catch { setBusy(false); }
  }
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => { setOpen(v => !v); setAuth(null); }} className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50" aria-haspopup="dialog" aria-expanded={open} aria-label="Mein Konto"><UserRound size={20}/><span className="hidden sm:inline">Konto</span><ChevronDown size={14} className={open ? "rotate-180" : ""}/></button>
      {open && <div role="dialog" aria-label="Kundenkonto" className="absolute right-0 top-full z-[100] mt-3 w-[330px] rounded-2xl border border-neutral-200 bg-white p-4 text-neutral-900 shadow-[0_16px_44px_rgba(0,0,0,.16)]">
        {auth === null ? <p className="p-2 text-sm text-neutral-600">Kundenkonto wird geladen …</p> : auth.authenticated ? <>
          <p className="px-2 text-sm font-extrabold">{auth.displayName ? `Hallo ${auth.displayName}` : "Mein Kundenkonto"}</p>
          <a href={`${account}/orders`} className="mt-4 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold hover:bg-neutral-50"><Package size={18} className="text-red-700"/> Bestellungen <ArrowRight size={15} className="ml-auto"/></a>
          <a href={`${account}/profile`} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold hover:bg-neutral-50"><MapPin size={18} className="text-red-700"/> Profil & Adressen <ArrowRight size={15} className="ml-auto"/></a>
          <Link href="/konto" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold hover:bg-neutral-50"><UserRound size={18} className="text-red-700"/> Mein Konto <ArrowRight size={15} className="ml-auto"/></Link>
          <button type="button" disabled={busy} onClick={logout} className="mt-2 flex w-full items-center gap-3 border-t border-neutral-100 px-3 py-3 text-left text-sm font-semibold hover:bg-neutral-50 disabled:opacity-50"><LogOut size={18} className="text-red-700"/> Abmelden</button>
        </> : <>
          <p className="px-2 text-sm font-extrabold">Willkommen bei IUMATEC</p>
          <p className="mt-1 px-2 text-xs leading-5 text-neutral-600">Melde dich mit deiner E-Mail-Adresse an. Du erhältst einen Bestätigungscode.</p>
          <form onSubmit={login} className="mt-4">
            <label htmlFor="iumatec-customer-login" className="block px-1 text-xs font-bold text-neutral-700">E-Mail-Adresse</label>
            <input id="iumatec-customer-login" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@beispiel.ch" className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none focus:border-red-600"/>
            <button type="submit" className="mt-3 flex w-full min-h-11 items-center justify-center rounded-xl bg-red-600 px-4 text-sm font-extrabold text-white hover:bg-red-700">Anmelden</button>
          </form>
          <p className="mt-2 px-1 text-[11px] leading-4 text-neutral-500">Neu bei IUMATEC? Melde dich mit deiner E-Mail-Adresse an. Dein Konto wird nach der Bestätigung automatisch erstellt.</p>
          <div className="mt-3 border-t border-neutral-100 pt-2"><Link href="/konto" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2 text-sm font-semibold hover:bg-neutral-50">Mein Konto</Link><Link href="/kontakt" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-neutral-50"><CircleHelp size={17}/> Hilfe & Kontakt</Link></div>
        </>}
      </div>}
    </div>
  );
}

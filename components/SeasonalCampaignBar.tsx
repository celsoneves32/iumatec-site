"use client";
import Link from "next/link";
import { CAMPAIGNS } from "@/config/seasonalCampaigns";

export default function SeasonalCampaignBar() {
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Zurich", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date());
  const active = CAMPAIGNS.find(c => c.enabled && c.start <= today && today <= c.end);
  if (!active) return null;
  return (
    <div className="border-b border-amber-500/30 bg-neutral-950 text-white">
      <Link href={active.href} className="mx-auto flex min-h-11 max-w-[1440px] flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-2 text-center transition hover:bg-neutral-900">
        <span className="rounded-full border border-amber-300/60 bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.13em] text-amber-200">IUMATEC SPECIAL</span>
        <span className="text-xs font-bold sm:text-sm">{active.title}</span>
        <span className="text-xs font-bold text-amber-300">Jetzt entdecken →</span>
      </Link>
    </div>
  );
}

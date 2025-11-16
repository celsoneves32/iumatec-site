// lib/gtag.ts
export function gtagEvent(action: string, params: Record<string, any>) {
  if (typeof window === "undefined") {
    return;
  }

  const w = window as any;

  if (typeof w.gtag === "function") {
    w.gtag("event", action, params);
  } else {
    console.log("[GTAG] gtag ainda não está disponível", { action, params });
  }
}

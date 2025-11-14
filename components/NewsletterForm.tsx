"use client";

import { useState } from "react";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<null | { ok: boolean; msg: string }>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    const emailTrim = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      setStatus({ ok: false, msg: "Bitte gültige E-Mail eingeben." });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailTrim }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.ok) {
        setStatus({ ok: true, msg: "Danke! Du bist im Newsletter." });
        setEmail("");
      } else {
        setStatus({ ok: false, msg: data?.error || "Etwas ist schiefgelaufen." });
      }
    } catch {
      setStatus({ ok: false, msg: "Netzwerkfehler – bitte erneut versuchen." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Deine E-Mail"
        className="flex-1 rounded-lg border px-3 py-3 dark:bg-white/5 dark:border-white/10"
        aria-label="Newsletter E-Mail"
        required
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-red-600 px-5 py-3 font-semibold text-white disabled:opacity-60"
      >
        {loading ? "Senden…" : "Abonnieren"}
      </button>

      {status && (
        <span
          className={`ml-2 self-center text-sm ${
            status.ok ? "text-green-700" : "text-red-600"
          }`}
        >
          {status.msg}
        </span>
      )}
    </form>
  );
}

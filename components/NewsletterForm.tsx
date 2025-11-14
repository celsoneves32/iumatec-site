"use client";

import { FormEvent, useState } from "react";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Etwas ist schiefgelaufen.");
      }

      setStatus("success");
      setMessage("Danke! Du bist im Newsletter.");
      setEmail("");
    } catch (err: any) {
      setStatus("error");
      setMessage(
        err?.message || "Etwas ist schiefgelaufen. Bitte versuche es erneut."
      );
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
      <label className="block text-sm font-medium">
        Newsletter
        <span className="block text-xs text-gray-500 dark:text-gray-400">
          Aktionen, neue Produkte & exklusive Deals per E-Mail.
        </span>
      </label>

      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="deine@email.ch"
          className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none 
                     focus:ring-2 focus:ring-red-600 
                     dark:bg-neutral-900 dark:border-neutral-700"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-xl bg-red-600 text-white px-4 py-2 text-sm font-semibold 
                     disabled:opacity-60 disabled:cursor-not-allowed hover:bg-red-700"
        >
          {status === "loading" ? "Senden…" : "Anmelden"}
        </button>
      </div>

      {message && (
        <p
          className={
            status === "success"
              ? "text-xs text-green-600"
              : "text-xs text-red-600"
          }
        >
          {message}
        </p>
      )}
    </form>
  );
}

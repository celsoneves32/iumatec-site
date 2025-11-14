"use client";

import { FormEvent, useState } from "react";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] =
    useState<"idle" | "loading" | "success" | "error">("idle");
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
        throw new Error(data.error || "Es ist ein Fehler aufgetreten.");
      }

      setStatus("success");
      setMessage("Danke! Du bist jetzt im Newsletter.");
      setEmail("");
    } catch (err: any) {
      setStatus("error");
      setMessage(
        err?.message || "Es ist ein Fehler aufgetreten. Bitte versuche es erneut."
      );
    }
  }

  return (
    <section
      className="
        rounded-2xl border border-neutral-200 bg-white 
        dark:bg-neutral-900 dark:border-neutral-800 
        p-4 sm:p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]
      "
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-red-600 text-white text-sm font-bold">
          ✉️
        </span>
        <div>
          <h3 className="text-xs font-semibold tracking-[0.12em] uppercase text-neutral-900 dark:text-neutral-50">
            Newsletter abonnieren
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Exklusive Aktionen, Neuheiten & Top-Deals direkt per E-Mail.
          </p>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 sm:flex-row sm:items-center"
      >
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-Mail-Adresse"
          className="
            flex-1 rounded-lg border border-neutral-300 
            px-3 py-2 text-sm outline-none 
            focus:ring-2 focus:ring-red-600 focus:border-red-600
            dark:bg-neutral-900 dark:border-neutral-700
          "
        />

        <button
          type="submit"
          disabled={status === "loading"}
          className="
            inline-flex items-center justify-center
            rounded-lg bg-red-600 px-4 py-2 text-xs sm:text-sm 
            font-semibold uppercase tracking-[0.12em] text-white
            hover:bg-red-700 transition disabled:opacity-60 
            disabled:cursor-not-allowed
          "
        >
          {status === "loading" ? "Senden…" : "Abonnieren"}
        </button>
      </form>

      {/* Messages */}
      {message && (
        <p
          className={
            status === "success"
              ? "mt-2 text-xs text-green-600"
              : "mt-2 text-xs text-red-600"
          }
        >
          {message}
        </p>
      )}
    </section>
  );
}

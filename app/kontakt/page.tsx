"use client";

import { FormEvent, useState } from "react";

export default function KontaktPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name || !email || !message) {
      setError("Bitte fülle alle Felder aus.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        setError(
          data?.error ||
            "Deine Nachricht konnte nicht gesendet werden. Bitte versuche es später erneut."
        );
        return;
      }

      setSuccess("Vielen Dank! Deine Nachricht wurde erfolgreich gesendet.");
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      console.error(err);
      setError(
        "Unerwarteter Fehler beim Senden. Bitte versuche es später erneut."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-10 text-gray-800 dark:text-gray-100">
      <h1 className="text-3xl font-semibold tracking-tight mb-2">Kontakt</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-8">
        Hast du Fragen zu deiner Bestellung oder zu unseren Produkten?
        Kontaktiere uns – wir helfen dir gerne weiter.
      </p>

      {/* Infos: Kundendienst & Adresse */}
      <div className="grid gap-8 md:grid-cols-2 mb-10">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <span className="text-red-600 text-lg">☎</span>
            Kundendienst
          </h2>

          <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-2">
            E-Mail:{" "}
            <a
              href="mailto:support@iumatec.ch"
              className="font-medium underline underline-offset-2 hover:text-brand-red"
            >
              support@iumatec.ch
            </a>
          </p>

          <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-2">
            Telefon:{" "}
            <a
              href="tel:+41765053344"
              className="font-medium underline underline-offset-2 hover:text-brand-red"
            >
              +41 76 505 33 44
            </a>{" "}
            <span className="text-xs text-neutral-500">(temporär)</span>
          </p>

          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-3">
            Antwort in der Regel innerhalb von 24 Stunden.
          </p>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <span className="text-red-600 text-lg">📍</span>
            Adresse
          </h2>

          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            IUMATEC Schweiz
          </p>
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            Elsässerstrasse 255
          </p>
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            4056 Basel
          </p>
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            Schweiz
          </p>

          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-3">
            Online-Shop mit Versand in die ganze Schweiz &amp; Liechtenstein.
          </p>
        </div>
      </div>

      {/* Status-Meldungen */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {success}
        </div>
      )}

      {/* Formular */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 space-y-4"
      >
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-1"
          >
            Name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            placeholder="Dein Name"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-1"
          >
            E-Mail-Adresse
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            placeholder="kunde@example.ch"
          />
        </div>

        <div>
          <label
            htmlFor="message"
            className="block text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-1"
          >
            Deine Nachricht
          </label>
          <textarea
            id="message"
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-none"
            placeholder="Wie können wir dir helfen?"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center rounded-md bg-red-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? "Nachricht wird gesendet…" : "Nachricht senden"}
        </button>
      </form>
    </main>
  );
}

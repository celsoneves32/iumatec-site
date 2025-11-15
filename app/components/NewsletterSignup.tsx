"use client";

import { useState } from "react";

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email || !email.includes("@")) {
      setStatus("error");
      setMessage("Por favor, introduz um email válido.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMessage(data?.error || "Ocorreu um erro. Tenta outra vez.");
        return;
      }

      setStatus("success");
      setMessage("Obrigado! A tua inscrição foi registada.");
      setEmail("");
    } catch (err) {
      console.error(err);
      setStatus("error");
      setMessage("Erro de ligação. Tenta novamente mais tarde.");
    }
  }

  return (
    <section className="w-full bg-neutral-900 text-white py-10 px-4">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-6">
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            Newsletter IUMATEC
          </h2>
          <p className="mt-2 text-sm md:text-base text-neutral-300">
            Ofertas exclusivas, promoções e novidades em tecnologia – direto no
            teu email.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 flex flex-col sm:flex-row items-center gap-3 w-full"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Insere o teu email"
            className="w-full sm:flex-1 px-4 py-3 rounded-full text-black text-sm outline-none border border-neutral-300 focus:border-red-600 focus:ring-2 focus:ring-red-600/60 transition"
            disabled={status === "loading"}
          />

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full sm:w-auto px-6 py-3 rounded-full font-semibold uppercase text-sm tracking-wide bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-60 disabled:cursor-not-allowed transition shadow-md"
          >
            {status === "loading" ? "A enviar..." : "Subscrever"}
          </button>
        </form>
      </div>

      {status !== "idle" && message && (
        <div className="max-w-5xl mx-auto mt-3 px-4">
          <p
            className={
              status === "success"
                ? "text-sm text-green-400"
                : "text-sm text-red-400"
            }
          >
            {message}
          </p>
        </div>
      )}
    </section>
  );
}

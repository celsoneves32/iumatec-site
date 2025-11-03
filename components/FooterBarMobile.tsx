"use client";

import { useEffect, useState } from "react";

export default function FooterBarMobile() {
  const [visible, setVisible] = useState(false);

  // Exibir apenas em telas pequenas e quando o usuário já rolou um pouco
  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 200) setVisible(true);
      else setVisible(false);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden">
      <div className="flex justify-around bg-white dark:bg-neutral-900 border-t dark:border-neutral-800 py-2 text-sm text-gray-700 dark:text-gray-200 shadow-[0_-2px_8px_rgba(0,0,0,0.1)]">
        {/* WhatsApp */}
        <a
          href="https://wa.me/41791234567"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center hover:text-brand-red"
        >
          <span className="text-xl">💬</span>
          <span>WhatsApp</span>
        </a>

        {/* E-Mail */}
        <a
          href="mailto:support@iumatec.ch"
          className="flex flex-col items-center hover:text-brand-red"
        >
          <span className="text-xl">📧</span>
          <span>E-Mail</span>
        </a>

        {/* Telefon */}
        <a
          href="tel:+41440000000"
          className="flex flex-col items-center hover:text-brand-red"
        >
          <span className="text-xl">📞</span>
          <span>Anrufen</span>
        </a>

        {/* Nach oben */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex flex-col items-center hover:text-brand-red"
        >
          <span className="text-xl">🔝</span>
          <span>Top</span>
        </button>
      </div>
    </div>
  );
}

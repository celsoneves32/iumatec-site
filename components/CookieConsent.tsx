"use client";
import { useEffect, useState } from "react";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) setVisible(true);
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookie-consent", "accepted");

    // Google Consent Mode v2
    (window as any).gtag("consent", "update", {
      ad_storage: "granted",
      analytics_storage: "granted",
    });

    setVisible(false);
  };

  const rejectCookies = () => {
    localStorage.setItem("cookie-consent", "rejected");

    // Block tracking
    (window as any).gtag("consent", "update", {
      ad_storage: "denied",
      analytics_storage: "denied",
    });

    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-neutral-900 text-white p-4 shadow-lg z-50">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm">
          Usamos cookies para melhorar a sua experiência e analisar o tráfego. 
          Pode aceitar ou recusar.
        </p>

        <div className="flex gap-3">
          <button
            onClick={rejectCookies}
            className="px-4 py-2 bg-neutral-700 rounded hover:bg-neutral-600 text-sm"
          >
            Recusar
          </button>

          <button
            onClick={acceptCookies}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 text-sm"
          >
            Aceitar
          </button>
        </div>
      </div>
    </div>
  );
}

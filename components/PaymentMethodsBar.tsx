// components/PaymentMethodsBar.tsx
import Image from "next/image";

export default function PaymentMethodsBar() {
  return (
    <section className="mt-10 border border-neutral-200/80 dark:border-neutral-800 rounded-xl bg-neutral-50/80 dark:bg-neutral-900/70 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-neutral-800 dark:text-neutral-100">
            Zahlungsmethoden
          </span>
          <span className="hidden sm:inline text-neutral-500">
            Sicher bezahlen mit:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {/* Visa */}
          <div className="flex h-7 items-center rounded-md border border-neutral-200 bg-white px-2 shadow-sm">
            <span className="text-[11px] font-semibold text-blue-700">VISA</span>
          </div>

          {/* Mastercard */}
          <div className="flex h-7 items-center rounded-md border border-neutral-200 bg-white px-2 shadow-sm">
            <span className="text-[11px] font-semibold text-orange-600">
              MasterCard
            </span>
          </div>

          {/* Twint */}
          <div className="flex h-7 items-center rounded-md border border-neutral-200 bg-white px-2 shadow-sm">
            <span className="text-[11px] font-semibold text-neutral-800">
              TWINT
            </span>
          </div>

          {/* PostFinance */}
          <div className="flex h-7 items-center rounded-md border border-neutral-200 bg-white px-2 shadow-sm">
            <span className="text-[11px] font-semibold text-yellow-600">
              PostFinance
            </span>
          </div>

          {/* PayPal */}
          <div className="flex h-7 items-center rounded-md border border-neutral-200 bg-white px-2 shadow-sm">
            <span className="text-[11px] font-semibold text-sky-600">
              PayPal
            </span>
          </div>

          {/* Rechnung (Kauf auf Rechnung) */}
          <div className="flex h-7 items-center rounded-md border border-neutral-200 bg-white px-2 shadow-sm">
            <span className="text-[11px] font-semibold text-neutral-700">
              Kauf auf Rechnung
            </span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 text-[11px] text-neutral-500">
          <span>🔒</span>
          <span>SSL-verschlüsselte Zahlung &amp; Schweizer Support</span>
        </div>
      </div>
    </section>
  );
}

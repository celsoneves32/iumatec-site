"use client";

const ACCOUNT_URL =
  process.env.NEXT_PUBLIC_SHOPIFY_CUSTOMER_ACCOUNTS_URL || "";

export default function HeaderAccount() {
  if (!ACCOUNT_URL) {
    return null;
  }

  return (
    <a
      href={ACCOUNT_URL}
      className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
      title="Mein Konto"
      aria-label="Mein Konto"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-5 w-5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 6.75a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 19.125a7.5 7.5 0 0 1 15 0"
        />
      </svg>

      <span className="hidden sm:inline">Konto</span>
    </a>
  );
}
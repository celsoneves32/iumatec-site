import Link from "next/link";

export const metadata = {
  title: "E-Mail bestätigt | IUMATEC",
  description: "Ihre E-Mail-Adresse wurde erfolgreich bestätigt.",
};

export default function ConfirmEmailPage() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold mb-3">
          E-Mail erfolgreich bestätigt
        </h1>

        <p className="text-sm text-neutral-600 mb-6">
          Vielen Dank. Ihr IUMATEC-Konto ist jetzt aktiv.
        </p>

        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-md bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700"
        >
          Jetzt anmelden
        </Link>

        <p className="mt-6 text-xs text-neutral-500">
          © {new Date().getFullYear()} IUMATEC Schweiz
        </p>
      </div>
    </main>
  );
}

// app/account/page.tsx
export default function AccountPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 space-y-4">
      <h1 className="text-2xl font-semibold">Mein Konto</h1>
      <p className="text-neutral-600">
        Geschützt via Middleware. (Server session folgt)
      </p>
    </main>
  );
}

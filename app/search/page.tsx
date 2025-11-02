export const metadata = {
  title: "Suche – IUMATEC",
  description: "Produkte im Shop durchsuchen."
};

export default function Page({ searchParams }: { searchParams?: { q?: string } }) {
  const q = (searchParams?.q ?? "").toString();

  return (
    <main style={{ maxWidth: 800, margin: "2rem auto", padding: "0 1rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>Suche</h1>

      <form action="/search" method="get" role="search" aria-label="Suche" style={{ marginBottom: "1rem" }}>
        <input
          name="q"
          defaultValue={q}
          placeholder="Produktsuche…"
          style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: 12, border: "1px solid #ddd", outline: "none" }}
        />
      </form>

      {q ? (
        <p style={{ color: "#444" }}>
          Ergebnisse für: <strong>{q}</strong>
        </p>
      ) : (
        <p style={{ color: "#777" }}>Gib oben einen Suchbegriff ein.</p>
      )}
    </main>
  );
}

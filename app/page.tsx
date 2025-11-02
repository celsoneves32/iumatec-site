export default function Home() {
  return (
    <main style={{ maxWidth: 960, margin: "2rem auto", padding: "0 1rem" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.5rem" }}>
        Technologie zu unschlagbaren Preisen
      </h1>
      <p style={{ color: "#555", marginBottom: "1rem" }}>
        Smartphones, TV & Audio, Informatik, Gaming und vieles mehr.
      </p>

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
        <a href="/search?q=promo" style={{ background: "#e11d48", color: "#fff", padding: "0.6rem 1rem", borderRadius: 12, fontWeight: 600, textDecoration: "none" }}>
          Angebote ansehen
        </a>
        <a href="/search?q=smartphones" style={{ border: "1px solid #ddd", padding: "0.6rem 1rem", borderRadius: 12, fontWeight: 600, textDecoration: "none" }}>
          Smartphones
        </a>
      </div>
    </main>
  );
}

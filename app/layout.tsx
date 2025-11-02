export const metadata = {
  title: "IUMATEC – Technik zu unschlagbaren Preisen",
  description:
    "Smartphones, TV & Audio, Informatik, Gaming – schnelle Lieferung in der ganzen Schweiz.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" }}>
        {children}
      </body>
    </html>
  );
}

// lib/emails/orderConfirmation.ts
type LineItem = {
  description?: string | null;
  quantity?: number | null;
  amount_total?: number | null; // cents
  currency?: string | null;
  price?: { unit_amount?: number | null } | null; // cents
};

function money(cents: number | null | undefined, currency: string) {
  if (typeof cents !== "number") return "-";
  return `${currency.toUpperCase()} ${(cents / 100).toFixed(2)}`;
}

export function buildOrderConfirmationHtml(input: {
  brand: string;
  siteUrl: string;
  customerEmail: string;
  createdAtISO: string;
  currency: string; // "chf"
  amountTotalCents: number | null;
  shippingCents: number | null;
  lineItems: LineItem[];
  ordersUrl: string;
}) {
  const {
    brand,
    siteUrl,
    customerEmail,
    createdAtISO,
    currency,
    amountTotalCents,
    shippingCents,
    lineItems,
    ordersUrl,
  } = input;

  const dateStr = new Date(createdAtISO).toLocaleString("de-CH");
  const shippingLine =
    shippingCents === null
      ? ""
      : shippingCents === 0
      ? "Versand: Kostenlos"
      : `Versand: ${money(shippingCents, currency)}`;

  const itemsRows =
    lineItems.length > 0
      ? lineItems
          .map((li) => {
            const title = li.description ?? "Artikel";
            const qty = typeof li.quantity === "number" ? li.quantity : 1;
            const unit = li.price?.unit_amount ?? null;
            const lineTotal = li.amount_total ?? null;

            return `
              <tr>
                <td style="padding:10px;border-bottom:1px solid #eee;">
                  <div style="font-weight:600">${escapeHtml(title)}</div>
                  <div style="color:#666;font-size:12px;">Menge: ${qty}</div>
                </td>
                <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;">
                  <div>${unit !== null ? money(unit, currency) : "-"}</div>
                  <div style="color:#666;font-size:12px;">Total: ${lineTotal !== null ? money(lineTotal, currency) : "-"}</div>
                </td>
              </tr>
            `;
          })
          .join("")
      : `
        <tr>
          <td colspan="2" style="padding:10px;color:#666;">
            Keine Artikelinformationen verfügbar.
          </td>
        </tr>
      `;

  const html = `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;max-width:680px;margin:0 auto;padding:24px;">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
      <div style="font-size:18px;font-weight:800;">${escapeHtml(brand)}</div>
      <div style="font-size:12px;color:#666;">
        <a href="${siteUrl}" style="color:#111;text-decoration:none;">${siteUrl.replace("https://", "")}</a>
      </div>
    </div>

    <h1 style="font-size:20px;margin:18px 0 6px 0;">Bestellbestätigung</h1>
    <div style="color:#555;font-size:13px;margin-bottom:14px;">
      Vielen Dank für deine Bestellung. Wir bestätigen den Eingang deiner Bestellung.
    </div>

    <div style="background:#fafafa;border:1px solid #eee;border-radius:12px;padding:14px;margin-bottom:16px;">
      <div style="font-size:13px;color:#444;margin-bottom:6px;">
        <strong>Konto:</strong> ${escapeHtml(customerEmail)}
      </div>
      <div style="font-size:13px;color:#444;margin-bottom:6px;">
        <strong>Datum:</strong> ${escapeHtml(dateStr)}
      </div>
      <div style="font-size:13px;color:#444;">
        <strong>Gesamt:</strong> ${amountTotalCents !== null ? money(amountTotalCents, currency) : "-"}
        ${shippingLine ? `<span style="color:#666;margin-left:10px;">(${escapeHtml(shippingLine)})</span>` : ""}
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:12px;overflow:hidden;">
      <thead>
        <tr>
          <th style="text-align:left;padding:10px;background:#f6f6f6;border-bottom:1px solid #eee;">Artikel</th>
          <th style="text-align:right;padding:10px;background:#f6f6f6;border-bottom:1px solid #eee;">Preis</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <div style="margin-top:16px;">
      <a href="${ordersUrl}" style="display:inline-block;background:#dc2626;color:white;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:700;font-size:13px;">
        Meine Bestellungen ansehen
      </a>
    </div>

    <div style="margin-top:18px;color:#777;font-size:12px;line-height:1.4;">
      Wenn du Fragen hast, antworte auf diese E-Mail oder kontaktiere uns unter
      <a href="mailto:kontakt@iumatec.ch" style="color:#111;">kontakt@iumatec.ch</a>.
    </div>
  </div>
  `;

  return html;
}

// simples escape para evitar problemas no HTML
function escapeHtml(str: string) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

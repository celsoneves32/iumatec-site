export function getDeliveryText(dateStr?: string | null) {
  if (!dateStr) return null;

  const parts = dateStr.split(".");
  if (parts.length !== 3) return null;

  const [day, month, year] = parts;
  const delivery = new Date(`${year}-${month}-${day}T00:00:00`);

  if (Number.isNaN(delivery.getTime())) return null;

  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const diff = Math.ceil(
    (delivery.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diff <= 0) return "Heute geliefert";
  if (diff === 1) return "Morgen geliefert";
  if (diff === 2) return "Übermorgen geliefert";

  return `Lieferung in ${diff} Tagen`;
}
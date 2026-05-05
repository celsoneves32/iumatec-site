export function formatPriceCH(price: number | null | undefined): string {
  if (price === null || price === undefined || Number.isNaN(price)) {
    return "–";
  }

  const roundedTo2 = Math.round(price * 100) / 100;
  const whole = Math.trunc(roundedTo2);
  const cents = Math.round((roundedTo2 - whole) * 100);

  if (cents === 0) {
    return `${whole}.–`;
  }

  return `${whole}.${String(cents).padStart(2, "0")}`;
}
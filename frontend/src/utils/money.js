// Shared price, date, and rental-duration helpers for website booking screens.
export function priceNumber(text) {
  const numeric = String(text ?? "").replace(/[^0-9.]/g, "");
  return Number.parseFloat(numeric || "0");
}

export function formatPeso(amount) {
  return `Php ${Number(amount || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDisplayDate(value) {
  if (!value) return "";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Inclusive day count, same rule the PHP version used (same day = 1 day). */
export function rentalDays(start, end) {
  if (!start || !end) return 0;
  const a = new Date(`${start}T00:00:00`);
  const b = new Date(`${end}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  const diff = b.getTime() - a.getTime();
  if (diff < 0) return 0;
  return Math.floor(diff / 86400000) + 1;
}

export function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

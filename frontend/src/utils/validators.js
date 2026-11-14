// Small helpers used by the booking forms.
// The same rules are checked again on the server (BookingController), so
// these only give the customer quick feedback before they submit.

/** Remove spaces, dashes and brackets: "0912 345-6789" -> "09123456789". */
export function cleanPhone(value) {
  return String(value ?? "").replace(/[\s\-()]/g, "");
}

/** Philippine mobile number: 09XXXXXXXXX or +639XXXXXXXXX. */
export function isValidPhone(value) {
  return /^(09|\+639)\d{9}$/.test(cleanPhone(value));
}

/** Driver's license number: letters, numbers, dashes and spaces (5 to 20 characters). */
export function isValidLicense(value) {
  return /^[A-Za-z0-9\- ]{5,20}$/.test(String(value ?? "").trim());
}

/** Format a Philippine driver's license number as XXX-XX-XXXXXX while typing. */
export function formatLicenseNumber(value) {
  const characters = String(value ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 11);
  if (characters.length <= 3) return characters;
  if (characters.length <= 5) return `${characters.slice(0, 3)}-${characters.slice(3)}`;
  return `${characters.slice(0, 3)}-${characters.slice(3, 5)}-${characters.slice(5)}`;
}

/** "14:30" -> "2:30 PM" (used in the confirmation popup). */
export function formatTime(value) {
  if (!value) return "";
  const [hourText, minute] = value.split(":");
  const hour = Number(hourText);
  if (Number.isNaN(hour)) return value;
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minute} ${suffix}`;
}

// Open WhatsApp (web/desktop) with a prefilled, editable message.
// Converts local Pakistani numbers (leading 0) to +92 international form.
export function openWhatsApp(mobile, message) {
  const digits = String(mobile || "").replace(/\D/g, "");
  let intl = digits;
  if (intl.startsWith("0")) intl = "92" + intl.slice(1);
  const text = encodeURIComponent(message || "");
  const url = intl ? `https://wa.me/${intl}?text=${text}` : `https://wa.me/?text=${text}`;
  window.open(url, "_blank");
}

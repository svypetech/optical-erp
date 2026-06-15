import React from "react";
import { fmtMoney } from "../components/ui";

// A printable invoice. Uses a dedicated print stylesheet so only this prints.
export default function Invoice({ sale, business, onClose }) {
  if (!sale) return null;
  const cur = business?.currency || "PKR";
  const rx = [
    ["Right", sale.rSph, sale.rCyl, sale.rAxis, sale.rAdd],
    ["Left", sale.lSph, sale.lCyl, sale.lAxis, sale.lAdd],
  ];

  // Build a clean WhatsApp text bill and open WhatsApp with it pre-filled.
  const sendWhatsApp = () => {
    const money = (n) => fmtMoney(n, cur);
    const L = [];
    L.push(`*${business?.name || "Optical Store"}*`);
    if (business?.address) L.push(business.address);
    if (business?.phone) L.push(`Phone: ${business.phone}`);
    L.push("");
    L.push(`*Invoice:* ${sale.invoiceNo}`);
    L.push(`*Date:* ${sale.saleDate}`);
    L.push(`*Customer:* ${sale.customerName}`);
    L.push("");
    L.push("*Order Details*");
    L.push(`Frame: ${money(sale.framePrice)}`);
    L.push(`Lens: ${money(sale.lensPrice)}`);
    if (sale.lensQuality) L.push(`Lens type: ${sale.lensQuality}`);
    if (sale.discountPct > 0) {
      L.push(`Subtotal: ${money(sale.subtotal)}`);
      L.push(`Discount (${sale.discountPct}%): -${money(sale.discountAmount)}`);
    }
    L.push(`*Total: ${money(sale.total)}*`);
    L.push(`Paid: ${money(sale.paid)}`);
    L.push(`*Balance Due: ${money(sale.due)}*`);
    if (sale.deliveryDate) {
      L.push("");
      L.push(`Delivery: ${sale.deliveryDate}`);
    }
    // prescription
    L.push("");
    L.push("*Prescription*");
    L.push(`R: SPH ${sale.rSph || "-"} CYL ${sale.rCyl || "-"} AXIS ${sale.rAxis || "-"} ADD ${sale.rAdd || "-"}`);
    L.push(`L: SPH ${sale.lSph || "-"} CYL ${sale.lCyl || "-"} AXIS ${sale.lAxis || "-"} ADD ${sale.lAdd || "-"}`);
    L.push("");
    L.push("Thank you for your business!");

    const text = encodeURIComponent(L.join("\n"));
    const phone = String(sale.mobile || "").replace(/\D/g, "");
    // wa.me needs international format; if it starts with 0 (local PK), convert to 92.
    let intl = phone;
    if (intl.startsWith("0")) intl = "92" + intl.slice(1);
    const url = phone
      ? `https://wa.me/${intl}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/50 p-4 print:static print:bg-white print:p-0">
      <div className="print-area my-6 w-full max-w-2xl rounded-2xl bg-white p-8 shadow-xl print:my-0 print:max-w-none print:rounded-none print:p-0 print:shadow-none print:text-[12px] dark:bg-white">
        {/* controls (hidden when printing) */}
        <div className="mb-6 flex justify-end gap-2 print:hidden">
          <button
            onClick={sendWhatsApp}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Send to WhatsApp
          </button>
          <button
            onClick={() => window.print()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Print
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        {/* header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            {business?.logoUrl ? (
              <img src={business.logoUrl} alt="logo" className="h-14 w-14 rounded object-contain" />
            ) : null}
            <div>
              <div className="text-2xl font-extrabold tracking-tight text-slate-900">
                {business?.name || "Optical Store"}
              </div>
              {business?.address && (
                <div className="text-xs text-slate-500">{business.address}</div>
              )}
              {business?.phone && (
                <div className="text-xs text-slate-400">Phone: {business.phone}</div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-slate-900">INVOICE</div>
            <div className="text-sm text-slate-500">{sale.invoiceNo}</div>
            <div className="text-xs text-slate-400">Date: {sale.saleDate}</div>
          </div>
        </div>

        {/* customer */}
        <div className="grid grid-cols-2 gap-4 py-4 text-sm">
          <div>
            <div className="font-semibold text-slate-700">Bill To</div>
            <div className="text-slate-900">{sale.customerName}</div>
            <div className="text-slate-500">{sale.mobile}</div>
          </div>
          <div className="text-right">
            {sale.deliveryDate && (
              <div>
                <span className="font-semibold text-slate-700">Delivery: </span>
                <span className="text-slate-900">{sale.deliveryDate}</span>
              </div>
            )}
            <div>
              <span className="font-semibold text-slate-700">Status: </span>
              <span className={sale.due <= 0 ? "text-emerald-600" : "text-rose-600"}>
                {sale.due <= 0 ? "Cleared" : "Pending"}
              </span>
            </div>
          </div>
        </div>

        {/* prescription */}
        <div className="mb-4">
          <div className="mb-1 text-sm font-semibold text-slate-700">Prescription</div>
          <table className="w-full border border-slate-200 text-center text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="border border-slate-200 px-2 py-1">Eye</th>
                <th className="border border-slate-200 px-2 py-1">SPH</th>
                <th className="border border-slate-200 px-2 py-1">CYL</th>
                <th className="border border-slate-200 px-2 py-1">AXIS</th>
                <th className="border border-slate-200 px-2 py-1">ADD</th>
              </tr>
            </thead>
            <tbody>
              {rx.map((r) => (
                <tr key={r[0]}>
                  <td className="border border-slate-200 px-2 py-1 font-medium">{r[0]}</td>
                  <td className="border border-slate-200 px-2 py-1">{r[1] || "—"}</td>
                  <td className="border border-slate-200 px-2 py-1">{r[2] || "—"}</td>
                  <td className="border border-slate-200 px-2 py-1">{r[3] || "—"}</td>
                  <td className="border border-slate-200 px-2 py-1">{r[4] || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {sale.lensQuality && (
            <div className="mt-2 text-sm text-slate-600">
              <span className="font-semibold">Lens:</span> {sale.lensQuality}
            </div>
          )}
        </div>

        {/* charges */}
        <table className="mb-4 w-full text-sm">
          <tbody>
            <tr className="border-t border-slate-200">
              <td className="py-2 text-slate-600">Frame</td>
              <td className="py-2 text-right text-slate-900">{fmtMoney(sale.framePrice, cur)}</td>
            </tr>
            <tr className="border-t border-slate-200">
              <td className="py-2 text-slate-600">Lens</td>
              <td className="py-2 text-right text-slate-900">{fmtMoney(sale.lensPrice, cur)}</td>
            </tr>
            {sale.discountPct > 0 && (
              <>
                <tr className="border-t border-slate-200">
                  <td className="py-2 text-slate-600">Subtotal</td>
                  <td className="py-2 text-right text-slate-900">{fmtMoney(sale.subtotal, cur)}</td>
                </tr>
                <tr className="border-t border-slate-200">
                  <td className="py-2 text-slate-600">Discount ({sale.discountPct}%)</td>
                  <td className="py-2 text-right text-amber-600">− {fmtMoney(sale.discountAmount, cur)}</td>
                </tr>
              </>
            )}
            <tr className="border-t border-slate-200 font-bold">
              <td className="py-2 text-slate-900">Total</td>
              <td className="py-2 text-right text-slate-900">{fmtMoney(sale.total, cur)}</td>
            </tr>
            <tr className="border-t border-slate-200">
              <td className="py-2 text-slate-600">Paid</td>
              <td className="py-2 text-right text-emerald-600">{fmtMoney(sale.paid, cur)}</td>
            </tr>
            <tr className="border-t border-slate-200 font-bold">
              <td className="py-2 text-slate-900">Balance Due</td>
              <td className="py-2 text-right text-rose-600">{fmtMoney(sale.due, cur)}</td>
            </tr>
          </tbody>
        </table>

        {/* payment history */}
        {sale.payments && sale.payments.length > 0 && (
          <div className="mb-4">
            <div className="mb-1 text-sm font-semibold text-slate-700">Payments</div>
            <table className="w-full text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="text-left font-medium">Date</th>
                  <th className="text-left font-medium">Type</th>
                  <th className="text-left font-medium">Method</th>
                  <th className="text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {sale.payments.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="py-1 text-slate-700">{p.date}</td>
                    <td className="py-1 text-slate-700">{p.kind}</td>
                    <td className="py-1 text-slate-700">{p.method}</td>
                    <td className="py-1 text-right text-slate-900">{fmtMoney(p.amount, cur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-8 border-t border-slate-200 pt-4 text-center text-xs text-slate-400 print:mt-3 print:pt-2">
          Thank you for your business!
        </div>
      </div>
    </div>
  );
}

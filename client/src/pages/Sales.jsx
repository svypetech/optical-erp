import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../api";
import { Button, Card, Input, Modal, fmtMoney } from "../components/ui";
import Invoice from "./Invoice";
import { openWhatsApp } from "../waHelper";

const today = () => new Date().toISOString().slice(0, 10);
const METHODS = ["POS", "EasyPaisa", "JazzCash", "Bank", "Cash USD", "Crypto USDT (Binance)"];

const emptySale = {
  customerName: "", mobile: "",
  rSph: "", rCyl: "", rAxis: "", rAdd: "",
  lSph: "", lCyl: "", lAxis: "", lAdd: "",
  lensQuality: "",
  framePrice: "", lensPrice: "",
  discountPct: "",
  advance: "", advanceMethod: "POS",
  deliveryDate: "", notes: "",
};

export default function Sales() {
  const { activeId, activeBusiness } = useApp();
  const cur = activeBusiness?.currency || "PKR";
  const [sales, setSales] = useState([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(emptySale);
  const [addOpen, setAddOpen] = useState(false);
  const [invoiceSale, setInvoiceSale] = useState(null);
  const [payFor, setPayFor] = useState(null); // sale awaiting balance payment
  const [pay, setPay] = useState({ amount: "", method: "POS", date: today(), delivered: true, accountId: "" });
  const [accounts, setAccounts] = useState([]);
  const [custMatch, setCustMatch] = useState(null); // matched existing customer
  const [linkChoice, setLinkChoice] = useState(null); // "existing" | "new" | null

  const load = async () => {
    if (!activeId) return;
    setSales(await api.listSales(activeId));
    setAccounts(await api.listAccounts(activeId));
  };
  useEffect(() => { load().catch(() => {}); }, [activeId]);

  // When both name and mobile are filled, check for an existing customer match.
  useEffect(() => {
    const name = form.customerName.trim();
    const mobile = form.mobile.trim();
    if (!addOpen || !name || !mobile) { setCustMatch(null); setLinkChoice(null); return; }
    const t = setTimeout(async () => {
      try {
        const { match } = await api.matchCustomer(activeId, name, mobile);
        setCustMatch(match);
        if (!match) setLinkChoice(null);
      } catch { /* ignore */ }
    }, 400);
    return () => clearTimeout(t);
  }, [form.customerName, form.mobile, addOpen, activeId]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const subtotal = (Number(form.framePrice) || 0) + (Number(form.lensPrice) || 0);
  let discPct = Number(form.discountPct) || 0;
  if (discPct < 0) discPct = 0;
  if (discPct > 100) discPct = 100;
  const discountAmount = Math.round((subtotal * discPct) / 100 * 100) / 100;
  const total = subtotal - discountAmount;
  const due = total - (Number(form.advance) || 0);

  const submit = async () => {
    if (!form.customerName.trim()) return alert("Customer name is required");
    // If there's a matching customer and the user hasn't chosen, ask first.
    if (custMatch && !linkChoice) {
      return alert("This customer already exists — choose 'Add to their ledger' or 'Create new' above.");
    }
    const payload = { ...form };
    if (custMatch && linkChoice === "existing") {
      payload.customerId = custMatch.id;
    }
    await api.createSale(activeId, payload);
    setForm(emptySale);
    setCustMatch(null);
    setLinkChoice(null);
    setAddOpen(false);
    await load();
  };

  const openInvoice = async (saleId) => {
    const full = await api.getSale(activeId, saleId);
    setInvoiceSale(full);
  };

  const submitPayment = async () => {
    const amt = Number(pay.amount) || 0;
    if (amt <= 0) return alert("Enter an amount");
    const saleRef = payFor;
    await api.addSalePayment(activeId, saleRef.id, {
      amount: amt, method: pay.method, date: pay.date, kind: "Balance", accountId: pay.accountId,
    });
    const wasDelivered = pay.delivered;
    setPayFor(null);
    setPay({ amount: "", method: "POS", date: today(), delivered: true, accountId: "" });
    await load();

    // If delivered, open WhatsApp with a prefilled (editable) delivery message.
    if (wasDelivered) {
      const shop = activeBusiness?.name || "our shop";
      const msg =
        `Dear ${saleRef.customerName},\n\n` +
        `Your glasses (Invoice ${saleRef.invoiceNo}) from ${shop} are ready and have been delivered. ` +
        `Your payment is now fully cleared.\n\n` +
        `Thank you for your business!`;
      openWhatsApp(saleRef.mobile, msg);
    }
  };

  const filtered = useMemo(() => {
    if (!query) return sales;
    const q = query.toLowerCase();
    return sales.filter((s) =>
      s.customerName.toLowerCase().includes(q) ||
      String(s.mobile).includes(q) ||
      String(s.invoiceNo).toLowerCase().includes(q)
    );
  }, [sales, query]);

  if (!activeId)
    return (
      <div className="grid h-64 place-items-center rounded-2xl border border-dashed border-slate-300 text-slate-500 dark:border-slate-700 dark:text-slate-400">
        Create a business first.
      </div>
    );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Sales</h1>
        <div className="flex-1" />
        <input
          placeholder="Search name / mobile / invoice…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
        />
        <Button onClick={() => { setForm(emptySale); setAddOpen(true); }}>+ New Sale</Button>
      </div>

      {/* Desktop / tablet: table */}
      <Card className="hidden overflow-x-auto p-0 md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <th className="px-3 py-3">Invoice</th>
              <th className="px-3 py-3">Customer</th>
              <th className="px-3 py-3">Mobile</th>
              <th className="px-3 py-3 text-right">Total</th>
              <th className="px-3 py-3 text-right">Paid</th>
              <th className="px-3 py-3 text-right">Due</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">No sales yet.</td></tr>
            )}
            {filtered.map((s) => (
              <tr key={s.id} className="border-b border-slate-100 text-slate-700 last:border-0 dark:border-slate-700/60 dark:text-slate-200">
                <td className="px-3 py-3 font-medium">{s.invoiceNo}</td>
                <td className="px-3 py-3">{s.customerName}</td>
                <td className="px-3 py-3">{s.mobile}</td>
                <td className="px-3 py-3 text-right">{fmtMoney(s.total, cur)}</td>
                <td className="px-3 py-3 text-right text-emerald-600">{fmtMoney(s.paid, cur)}</td>
                <td className="px-3 py-3 text-right text-rose-600">{fmtMoney(s.due, cur)}</td>
                <td className="px-3 py-3">
                  <span className={"rounded-full px-2 py-0.5 text-xs font-semibold " +
                    (s.due <= 0
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300")}>
                    {s.due <= 0 ? "Cleared" : "Pending"}
                  </span>
                </td>
                <td className="px-3 py-3 text-right whitespace-nowrap">
                  {s.due > 0 && (
                    <button onClick={() => { setPayFor(s); setPay({ amount: String(s.due), method: "POS", date: today(), delivered: true, accountId: "" }); }}
                      className="mr-2 rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300">
                      Clear Due
                    </button>
                  )}
                  <button onClick={() => openInvoice(s.id)}
                    className="mr-2 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200">
                    Invoice
                  </button>
                  <button onClick={async () => { if (confirm("Delete this sale?")) { await api.deleteSale(activeId, s.id); load(); } }}
                    className="rounded-md px-2 py-1 text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Mobile: cards */}
      <div className="space-y-3 md:hidden">
        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-400 dark:border-slate-700">No sales yet.</div>
        )}
        {filtered.map((s) => (
          <Card key={s.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-bold text-slate-900 dark:text-white">{s.customerName}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{s.invoiceNo} • {s.mobile}</div>
              </div>
              <span className={"rounded-full px-2 py-0.5 text-xs font-semibold " +
                (s.due <= 0
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300")}>
                {s.due <= 0 ? "Cleared" : "Pending"}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <div><div className="text-xs text-slate-400">Total</div><div className="font-semibold text-slate-800 dark:text-slate-100">{fmtMoney(s.total, cur)}</div></div>
              <div><div className="text-xs text-slate-400">Paid</div><div className="font-semibold text-emerald-600">{fmtMoney(s.paid, cur)}</div></div>
              <div><div className="text-xs text-slate-400">Due</div><div className="font-semibold text-rose-600">{fmtMoney(s.due, cur)}</div></div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {s.due > 0 && (
                <button onClick={() => { setPayFor(s); setPay({ amount: String(s.due), method: "POS", date: today(), delivered: true, accountId: "" }); }}
                  className="flex-1 rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white">Clear Due</button>
              )}
              <button onClick={() => openInvoice(s.id)}
                className="flex-1 rounded-md bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">Invoice</button>
              <button onClick={async () => { if (confirm("Delete this sale?")) { await api.deleteSale(activeId, s.id); load(); } }}
                className="rounded-md px-3 py-2 text-xs font-semibold text-rose-500">Delete</button>
            </div>
          </Card>
        ))}
      </div>

      {/* New Sale modal */}
      <Modal open={addOpen} title="New Optical Sale" onClose={() => setAddOpen(false)}>
        <div className="max-h-[70vh] space-y-4 overflow-auto pr-1">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Customer Name" value={form.customerName} onChange={set("customerName")} />
            <Input label="Mobile Number" value={form.mobile} onChange={set("mobile")} />
          </div>

          {custMatch && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-900/20">
              <div className="font-semibold text-amber-800 dark:text-amber-300">
                This customer is already in your database.
              </div>
              <div className="mt-1 text-amber-700 dark:text-amber-400">
                {custMatch.name} • {custMatch.mobile} — {custMatch.salesCount} previous bill(s)
              </div>
              {custMatch.salesCount >= 3 && (
                <div className="mt-2 rounded-md bg-emerald-100 px-2 py-1.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                  ★ Loyal customer ({custMatch.salesCount} bills) — consider offering a discount.
                </div>
              )}
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => setLinkChoice("existing")}
                  className={"rounded-md px-3 py-1.5 text-xs font-semibold " +
                    (linkChoice === "existing" ? "bg-amber-600 text-white" : "bg-white text-amber-800 ring-1 ring-amber-300 dark:bg-slate-800 dark:text-amber-300")}>
                  Add to their ledger
                </button>
                <button type="button" onClick={() => setLinkChoice("new")}
                  className={"rounded-md px-3 py-1.5 text-xs font-semibold " +
                    (linkChoice === "new" ? "bg-amber-600 text-white" : "bg-white text-amber-800 ring-1 ring-amber-300 dark:bg-slate-800 dark:text-amber-300")}>
                  Create new customer
                </button>
              </div>
            </div>
          )}

          <div>
            <div className="mb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Prescription</div>
            <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600">
              <table className="w-full text-center text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                  <tr><th className="py-1">Eye</th><th>SPH</th><th>CYL</th><th>AXIS</th><th>ADD</th></tr>
                </thead>
                <tbody>
                  <tr className="border-t border-slate-200 dark:border-slate-600">
                    <td className="py-1 font-medium text-slate-600 dark:text-slate-300">R</td>
                    {["rSph","rCyl","rAxis","rAdd"].map((k) => (
                      <td key={k} className="p-1"><input value={form[k]} onChange={set(k)}
                        className="w-16 rounded border border-slate-300 px-1 py-1 text-center text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white" /></td>
                    ))}
                  </tr>
                  <tr className="border-t border-slate-200 dark:border-slate-600">
                    <td className="py-1 font-medium text-slate-600 dark:text-slate-300">L</td>
                    {["lSph","lCyl","lAxis","lAdd"].map((k) => (
                      <td key={k} className="p-1"><input value={form[k]} onChange={set(k)}
                        className="w-16 rounded border border-slate-300 px-1 py-1 text-center text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white" /></td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <Input label="Lens Quality" value={form.lensQuality} onChange={set("lensQuality")} placeholder="e.g. Blue-cut anti-glare" />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Frame Price" type="number" value={form.framePrice} onChange={set("framePrice")} />
            <Input label="Lens Price" type="number" value={form.lensPrice} onChange={set("lensPrice")} />
          </div>

          <Input label="Discount %" type="number" value={form.discountPct} onChange={set("discountPct")} placeholder="e.g. 10" />

          <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900">
            <div className="flex justify-between"><span className="text-slate-500">Subtotal</span>
              <span className="text-slate-900 dark:text-white">{fmtMoney(subtotal, cur)}</span></div>
            {discPct > 0 && (
              <div className="flex justify-between"><span className="text-slate-500">Discount ({discPct}%)</span>
                <span className="text-amber-600">− {fmtMoney(discountAmount, cur)}</span></div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-1 dark:border-slate-700"><span className="text-slate-500">Total</span>
              <span className="font-bold text-slate-900 dark:text-white">{fmtMoney(total, cur)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Due after advance</span>
              <span className="font-bold text-rose-600">{fmtMoney(due, cur)}</span></div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Advance Paid" type="number" value={form.advance} onChange={set("advance")} />
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Advance Sent To</span>
              <select value={form.advanceMethod} onChange={set("advanceMethod")}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white">
                {METHODS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Received Into Account</span>
              <select value={form.advanceAccountId || ""} onChange={set("advanceAccountId")}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white">
                <option value="">-- Select account (optional) --</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </label>
          </div>

          <Input label="Delivery Date" type="date" value={form.deliveryDate} onChange={set("deliveryDate")} />
          <Input label="Notes" value={form.notes} onChange={set("notes")} />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={submit}>Save Sale</Button>
          </div>
        </div>
      </Modal>

      {/* Clear Due modal */}
      <Modal open={!!payFor} title={`Clear Due — ${payFor?.invoiceNo || ""}`} onClose={() => setPayFor(null)}>
        <div className="space-y-4">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Balance due: <span className="font-bold text-rose-600">{fmtMoney(payFor?.due || 0, cur)}</span>
          </div>
          <Input label="Amount Received" type="number" value={pay.amount}
            onChange={(e) => setPay({ ...pay, amount: e.target.value })} />
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Sent To</span>
            <select value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white">
              {METHODS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <Input label="Date Received" type="date" value={pay.date}
            onChange={(e) => setPay({ ...pay, date: e.target.value })} />
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Received Into Account</span>
            <select value={pay.accountId} onChange={(e) => setPay({ ...pay, accountId: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white">
              <option value="">-- Select account (optional) --</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900">
            <input type="checkbox" checked={pay.delivered}
              onChange={(e) => setPay({ ...pay, delivered: e.target.checked })}
              className="h-4 w-4" />
            <span className="text-slate-700 dark:text-slate-200">
              Glasses delivered to customer (send WhatsApp confirmation)
            </span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setPayFor(null)}>Cancel</Button>
            <Button onClick={submitPayment}>Record Payment</Button>
          </div>
        </div>
      </Modal>

      {invoiceSale && (
        <Invoice sale={invoiceSale} business={activeBusiness} onClose={() => setInvoiceSale(null)} />
      )}
    </div>
  );
}

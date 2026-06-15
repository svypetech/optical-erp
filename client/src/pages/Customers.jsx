import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../api";
import { Button, Card, Input, Modal, fmtMoney } from "../components/ui";
import Invoice from "./Invoice";

export default function Customers() {
  const { activeId, activeBusiness } = useApp();
  const cur = activeBusiness?.currency || "PKR";
  const [customers, setCustomers] = useState([]);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState(null); // customer whose ledger is open
  const [ledger, setLedger] = useState(null);
  const [invoiceSale, setInvoiceSale] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ name: "", mobile: "", notes: "" });
  const [rxOpen, setRxOpen] = useState(false);
  const [rxForm, setRxForm] = useState({});

  const load = async () => {
    if (!activeId) return;
    setCustomers(await api.listCustomers(activeId));
  };
  useEffect(() => { load().catch(() => {}); }, [activeId]);

  const openLedger = async (id) => {
    setOpenId(id);
    setLedger(await api.customerLedger(activeId, id));
  };

  const openRxEdit = () => {
    const c = ledger.customer;
    setRxForm({
      rSph: c.rSph || "", rCyl: c.rCyl || "", rAxis: c.rAxis || "", rAdd: c.rAdd || "",
      lSph: c.lSph || "", lCyl: c.lCyl || "", lAxis: c.lAxis || "", lAdd: c.lAdd || "",
    });
    setRxOpen(true);
  };

  const saveRx = async () => {
    await api.updateCustomer(activeId, ledger.customer.id, rxForm);
    setRxOpen(false);
    setLedger(await api.customerLedger(activeId, openId));
  };

  const showInvoice = async (saleId) => {
    setInvoiceSale(await api.getSale(activeId, saleId));
  };

  const saveCustomer = async () => {
    if (!form.name.trim()) return alert("Name required");
    await api.createCustomer(activeId, form);
    setForm({ name: "", mobile: "", notes: "" });
    setEditOpen(false);
    await load();
  };

  const filtered = useMemo(() => {
    if (!query) return customers;
    const q = query.toLowerCase();
    return customers.filter((c) =>
      c.name.toLowerCase().includes(q) || String(c.mobile).replace(/\D/g, "").includes(q.replace(/\D/g, "")));
  }, [customers, query]);

  if (!activeId)
    return (
      <div className="grid h-64 place-items-center rounded-2xl border border-dashed border-slate-300 text-slate-500 dark:border-slate-700 dark:text-slate-400">
        Create a business first.
      </div>
    );

  // ---- Ledger view ----
  if (openId && ledger) {
    const c = ledger.customer;
    return (
      <div>
        <button onClick={() => { setOpenId(null); setLedger(null); }}
          className="mb-4 text-sm font-semibold text-indigo-600 hover:underline">← Back to customers</button>

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{c.name}</h1>
          <span className="text-sm text-slate-500 dark:text-slate-400">{c.mobile}</span>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card><div className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Billed</div>
            <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{fmtMoney(ledger.totalBilled, cur)}</div></Card>
          <Card><div className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Paid</div>
            <div className="mt-2 text-2xl font-bold text-emerald-600">{fmtMoney(ledger.totalPaid, cur)}</div></Card>
          <Card><div className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Due</div>
            <div className={"mt-2 text-2xl font-bold " + (ledger.totalDue > 0 ? "text-rose-600" : "text-emerald-600")}>{fmtMoney(ledger.totalDue, cur)}</div></Card>
        </div>

        <Card className="mb-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-bold text-slate-700 dark:text-slate-200">Current Prescription (Eyesight)</div>
            <button onClick={openRxEdit} className="text-xs font-semibold text-indigo-600 hover:underline">Edit</button>
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600">
            <table className="w-full text-center text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                <tr><th className="py-1.5">Eye</th><th>SPH</th><th>CYL</th><th>AXIS</th><th>ADD</th></tr>
              </thead>
              <tbody className="text-slate-700 dark:text-slate-200">
                <tr className="border-t border-slate-200 dark:border-slate-600">
                  <td className="py-1.5 font-medium">Right</td>
                  <td>{c.rSph || "—"}</td><td>{c.rCyl || "—"}</td><td>{c.rAxis || "—"}</td><td>{c.rAdd || "—"}</td>
                </tr>
                <tr className="border-t border-slate-200 dark:border-slate-600">
                  <td className="py-1.5 font-medium">Left</td>
                  <td>{c.lSph || "—"}</td><td>{c.lCyl || "—"}</td><td>{c.lAxis || "—"}</td><td>{c.lAdd || "—"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="mb-5 overflow-x-auto p-0">
          <div className="px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200">Bills</div>
          <table className="w-full text-sm">
            <thead><tr className="border-y border-slate-200 text-left text-xs font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <th className="px-4 py-2">Invoice</th><th className="px-4 py-2">Date</th>
              <th className="px-4 py-2 text-right">Total</th><th className="px-4 py-2 text-right">Paid</th>
              <th className="px-4 py-2 text-right">Due</th><th className="px-4 py-2">Status</th><th /></tr></thead>
            <tbody>
              {ledger.sales.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No bills yet.</td></tr>}
              {ledger.sales.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0 dark:border-slate-700/60">
                  <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">{s.invoiceNo}</td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{s.saleDate}</td>
                  <td className="px-4 py-2 text-right">{fmtMoney(s.total, cur)}</td>
                  <td className="px-4 py-2 text-right text-emerald-600">{fmtMoney(s.paid, cur)}</td>
                  <td className="px-4 py-2 text-right text-rose-600">{fmtMoney(s.due, cur)}</td>
                  <td className="px-4 py-2">{s.due <= 0 ? "Cleared" : "Pending"}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => showInvoice(s.id)}
                      className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200">Invoice</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card className="overflow-x-auto p-0">
          <div className="px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200">Payment History</div>
          <table className="w-full text-sm">
            <thead><tr className="border-y border-slate-200 text-left text-xs font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <th className="px-4 py-2">Date</th><th className="px-4 py-2">Invoice</th>
              <th className="px-4 py-2">Type</th><th className="px-4 py-2">Method</th><th className="px-4 py-2 text-right">Amount</th></tr></thead>
            <tbody>
              {ledger.payments.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No payments yet.</td></tr>}
              {ledger.payments.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0 dark:border-slate-700/60">
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{p.date}</td>
                  <td className="px-4 py-2">{p.invoiceNo}</td>
                  <td className="px-4 py-2">{p.kind}</td>
                  <td className="px-4 py-2">{p.method}</td>
                  <td className="px-4 py-2 text-right text-emerald-600">{fmtMoney(p.amount, cur)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {invoiceSale && <Invoice sale={invoiceSale} business={activeBusiness} onClose={() => setInvoiceSale(null)} />}

        <Modal open={rxOpen} title="Edit Prescription" onClose={() => setRxOpen(false)}>
          <div className="space-y-4">
            <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600">
              <table className="w-full text-center text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                  <tr><th className="py-1">Eye</th><th>SPH</th><th>CYL</th><th>AXIS</th><th>ADD</th></tr>
                </thead>
                <tbody>
                  <tr className="border-t border-slate-200 dark:border-slate-600">
                    <td className="py-1 font-medium text-slate-600 dark:text-slate-300">R</td>
                    {["rSph","rCyl","rAxis","rAdd"].map((k) => (
                      <td key={k} className="p-1"><input value={rxForm[k] || ""} onChange={(e) => setRxForm({ ...rxForm, [k]: e.target.value })}
                        className="w-16 rounded border border-slate-300 px-1 py-1 text-center text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white" /></td>
                    ))}
                  </tr>
                  <tr className="border-t border-slate-200 dark:border-slate-600">
                    <td className="py-1 font-medium text-slate-600 dark:text-slate-300">L</td>
                    {["lSph","lCyl","lAxis","lAdd"].map((k) => (
                      <td key={k} className="p-1"><input value={rxForm[k] || ""} onChange={(e) => setRxForm({ ...rxForm, [k]: e.target.value })}
                        className="w-16 rounded border border-slate-300 px-1 py-1 text-center text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white" /></td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setRxOpen(false)}>Cancel</Button>
              <Button onClick={saveRx}>Save</Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // ---- List view ----
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Customers</h1>
        <div className="flex-1" />
        <input placeholder="Search name / mobile…" value={query} onChange={(e) => setQuery(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
        <Button onClick={() => { setForm({ name: "", mobile: "", notes: "" }); setEditOpen(true); }}>+ New Customer</Button>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <th className="px-4 py-3">Name</th><th className="px-4 py-3">Mobile</th>
            <th className="px-4 py-3 text-right">Bills</th><th className="px-4 py-3 text-right">Total Billed</th>
            <th className="px-4 py-3 text-right">Due</th><th /></tr></thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No customers yet.</td></tr>}
            {filtered.map((c) => (
              <tr key={c.id} className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-700/60 dark:hover:bg-slate-700/30"
                onClick={() => openLedger(c.id)}>
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{c.name}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{c.mobile}</td>
                <td className="px-4 py-3 text-right">{c.salesCount}</td>
                <td className="px-4 py-3 text-right">{fmtMoney(c.totalBilled, cur)}</td>
                <td className={"px-4 py-3 text-right font-semibold " + (c.totalDue > 0 ? "text-rose-600" : "text-emerald-600")}>{fmtMoney(c.totalDue, cur)}</td>
                <td className="px-4 py-3 text-right text-xs text-indigo-600">Open ledger →</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={editOpen} title="New Customer" onClose={() => setEditOpen(false)}>
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Mobile" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
          <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveCustomer}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

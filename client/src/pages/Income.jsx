import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../api";
import { Button, Card, Input, Modal, fmtMoney } from "../components/ui";

const today = () => new Date().toISOString().slice(0, 10);

// Income tab = read-only view of ALL money received:
//  - manual income entries (added here)
//  - every sale payment (advances + cleared balances) from the Sales tab
export default function Income() {
  const { activeId, activeBusiness } = useApp();
  const cur = activeBusiness?.currency || "PKR";
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ customerName: "", date: today(), amount: "", notes: "" });

  const load = async () => {
    if (!activeId) return;
    setRows(await api.listIncomeAll(activeId));
  };
  useEffect(() => { load().catch(() => {}); }, [activeId]);

  const addManual = async () => {
    if (!form.amount) return alert("Enter an amount");
    await api.addIncome(activeId, { ...form, amount: Number(form.amount) });
    setForm({ customerName: "", date: today(), amount: "", notes: "" });
    setAddOpen(false);
    await load();
  };

  const removeManual = async (id) => {
    if (!confirm("Delete this manual income entry?")) return;
    await api.deleteIncome(activeId, id);
    await load();
  };

  const filtered = useMemo(() => {
    if (!query) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) =>
      r.description.toLowerCase().includes(q) ||
      String(r.method).toLowerCase().includes(q) ||
      String(r.amount).includes(q) ||
      String(r.date).includes(q)
    );
  }, [rows, query]);

  const total = filtered.reduce((a, r) => a + Number(r.amount || 0), 0);

  if (!activeId)
    return (
      <div className="grid h-64 place-items-center rounded-2xl border border-dashed border-slate-300 text-slate-500 dark:border-slate-700 dark:text-slate-400">
        Create a business first.
      </div>
    );

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Income</h1>
        <div className="flex-1" />
        <input
          placeholder="Search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
        />
        <Button onClick={() => setAddOpen(true)}>+ Manual Income</Button>
      </div>
      <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
        All money received — sale payments appear automatically; add miscellaneous cash with “Manual Income”.
      </p>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No income yet.</td></tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 text-slate-700 last:border-0 dark:border-slate-700/60 dark:text-slate-200">
                <td className="px-4 py-3">{r.date}</td>
                <td className="px-4 py-3">
                  <span className={"rounded-full px-2 py-0.5 text-xs font-semibold " +
                    (r.source === "Sale"
                      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300")}>
                    {r.source}
                  </span>
                </td>
                <td className="px-4 py-3">{r.description}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{r.method || "—"}</td>
                <td className="px-4 py-3 text-right font-semibold text-emerald-600">{fmtMoney(r.amount, cur)}</td>
                <td className="px-4 py-3 text-right">
                  {r.editable ? (
                    <button onClick={() => removeManual(r.id)}
                      className="rounded p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30">🗑</button>
                  ) : (
                    <span className="text-xs text-slate-400">from Sales</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t border-slate-200 font-bold text-slate-900 dark:border-slate-700 dark:text-white">
                <td className="px-4 py-3" colSpan={4}>Total</td>
                <td className="px-4 py-3 text-right">{fmtMoney(total, cur)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </Card>

      <Modal open={addOpen} title="Add Manual Income" onClose={() => setAddOpen(false)}>
        <div className="space-y-4">
          <Input label="Description / Customer" value={form.customerName}
            onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
          <Input label="Date" type="date" value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Input label="Amount" type="number" value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Input label="Notes" value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addManual}>Add</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

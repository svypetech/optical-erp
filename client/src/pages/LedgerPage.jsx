import React, { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../api";
import { Button, Card, Input, Modal, fmtMoney } from "../components/ui";

const today = () => new Date().toISOString().slice(0, 10);

const EXPENSE_CATEGORIES = ["Business", "Personal", "Travel", "Inventory"];

export default function LedgerPage({
  title, nameField, nameLabel, accent,
  listFn, addFn, updateFn, deleteFn,
  showCategory = false,
}) {
  const { activeId, activeBusiness } = useApp();
  const cur = activeBusiness?.currency || "USD";
  const [rows, setRows] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null);
  const emptyForm = {
    [nameField]: "", date: today(), amount: "", notes: "",
    ...(showCategory ? { category: "Business" } : {}),
    accountId: "",
  };
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    if (!activeId) return;
    setRows(await listFn(activeId));
    const accs = await api.listAccounts(activeId);
    setAccounts(accs);
  };
  useEffect(() => { load().catch(() => {}); }, [activeId]);

  const openAdd = () => { setForm(emptyForm); setModal({}); };
  const openEdit = (r) => {
    setForm({
      [nameField]: r[nameField], date: r.date, amount: r.amount,
      notes: r.notes,
      ...(showCategory ? { category: r.category || "Business" } : {}),
      accountId: r.accountId || "",
    });
    setModal(r);
  };

  const save = async () => {
    const payload = { ...form, amount: Number(form.amount) || 0 };
    if (modal && modal.id) await updateFn(activeId, modal.id, payload);
    else await addFn(activeId, payload);
    setModal(null);
    await load();
  };
  const remove = async (id) => {
    if (!confirm("Delete this entry?")) return;
    await deleteFn(activeId, id);
    await load();
  };

  const filtered = query
    ? rows.filter((r) => String(r[nameField] || "").toLowerCase().includes(query.toLowerCase()))
    : rows;
  const total = filtered.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  const accountName = (id) => accounts.find((a) => a.id === id)?.name || "";

  const categoryBadge = (cat) => {
    const colors = {
      Business: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
      Personal: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
      Travel: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
      Inventory: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    };
    return <span className={"rounded-full px-2 py-0.5 text-xs font-semibold " + (colors[cat] || colors.Business)}>{cat}</span>;
  };

  if (!activeId) return (
    <div className="grid h-64 place-items-center rounded-2xl border border-dashed border-slate-300 text-slate-500 dark:border-slate-700">
      Create a business first.
    </div>
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
        <div className="flex-1" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..."
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
        <Button onClick={openAdd}>+ Add</Button>
      </div>

      {/* Desktop table */}
      <Card className="hidden overflow-x-auto p-0 md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <th className="px-4 py-3">{nameLabel}</th>
              {showCategory && <th className="px-4 py-3">Category</th>}
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Notes</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={showCategory ? 7 : 6} className="px-4 py-10 text-center text-slate-400">No entries yet.</td></tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 text-slate-700 last:border-0 dark:border-slate-700/60 dark:text-slate-200">
                <td className="px-4 py-3 font-medium">{r[nameField]}</td>
                {showCategory && <td className="px-4 py-3">{categoryBadge(r.category)}</td>}
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{accountName(r.accountId) || "—"}</td>
                <td className="px-4 py-3">{r.date}</td>
                <td className="px-4 py-3 text-right font-semibold">{fmtMoney(r.amount, cur)}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{r.notes}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button onClick={() => openEdit(r)} className="mr-2 rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">✎</button>
                  <button onClick={() => remove(r.id)} className="rounded p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30">🗑</button>
                </td>
              </tr>
            ))}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t border-slate-200 font-bold text-slate-900 dark:border-slate-700 dark:text-white">
                <td className="px-4 py-3" colSpan={showCategory ? 4 : 3}>Total</td>
                <td className="px-4 py-3 text-right">{fmtMoney(total, cur)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </Card>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-400 dark:border-slate-700">No entries yet.</div>
        )}
        {filtered.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">{r[nameField]}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{r.date}</span>
                  {showCategory && categoryBadge(r.category)}
                  {r.accountId && <span className="text-xs text-slate-400">{accountName(r.accountId)}</span>}
                </div>
              </div>
              <span className="text-lg font-bold text-slate-800 dark:text-slate-100">{fmtMoney(r.amount, cur)}</span>
            </div>
            {r.notes && <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{r.notes}</div>}
            <div className="mt-3 flex gap-2">
              <button onClick={() => openEdit(r)} className="flex-1 rounded-md bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">✎ Edit</button>
              <button onClick={() => remove(r.id)} className="rounded-md px-3 py-2 text-xs font-semibold text-rose-500">🗑 Delete</button>
            </div>
          </Card>
        ))}
        {filtered.length > 0 && (
          <Card className="flex items-center justify-between p-4 font-bold text-slate-900 dark:text-white">
            <span>Total</span><span>{fmtMoney(total, cur)}</span>
          </Card>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal open={!!modal} title={modal?.id ? `Edit ${title.replace(/s$/, "")}` : `Add ${title.replace(/s$/, "")}`} onClose={() => setModal(null)}>
        <div className="space-y-4">
          <Input label={nameLabel} value={form[nameField]}
            onChange={(e) => setForm({ ...form, [nameField]: e.target.value })} />

          {showCategory && (
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Category</span>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white">
                {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
              {showCategory ? "Paid From Account" : "Received Into Account"}
            </span>
            <select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white">
              <option value="">-- Select account (optional) --</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>

          <Input label="Date" type="date" value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Input label="Amount" type="number" step="0.01" value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Input label="Notes" value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })} />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../api";
import { Button, Card, Input, Modal, fmtMoney } from "../components/ui";

const today = () => new Date().toISOString().slice(0,10);

export default function Transfers() {
  const { activeId, activeBusiness } = useApp();
  const cur = activeBusiness?.currency || "PKR";
  const [transfers, setTransfers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ fromAccountId:"", toAccountId:"", amount:"", date:today(), notes:"" });

  const load = async () => {
    if (!activeId) return;
    const [t,a] = await Promise.all([api.listTransfers(activeId), api.listAccounts(activeId)]);
    setTransfers(t); setAccounts(a);
  };
  useEffect(() => { load(); }, [activeId]);

  const save = async () => {
    if (!form.fromAccountId || !form.toAccountId) return alert("Select both accounts");
    if (form.fromAccountId === form.toAccountId) return alert("Cannot transfer to same account");
    if (!form.amount || Number(form.amount) <= 0) return alert("Enter a valid amount");
    await api.createTransfer(activeId, form);
    setModal(false); load();
  };

  const remove = async (id) => {
    if (!confirm("Delete this transfer?")) return;
    await api.deleteTransfer(activeId, id); load();
  };

  if (!activeId) return <div className="p-6 text-slate-400">Select a business first.</div>;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Transfers</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Move money between your accounts.</p>
        </div>
        <Button onClick={() => { setForm({ fromAccountId:"", toAccountId:"", amount:"", date:today(), notes:"" }); setModal(true); }}>+ New Transfer</Button>
      </div>

      {/* Desktop table */}
      <Card className="hidden overflow-x-auto p-0 md:block">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <th className="px-4 py-3">Date</th><th className="px-4 py-3">From</th>
            <th className="px-4 py-3">To</th><th className="px-4 py-3 text-right">Amount</th>
            <th className="px-4 py-3">Notes</th><th /></tr></thead>
          <tbody>
            {transfers.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No transfers yet.</td></tr>}
            {transfers.map(t => (
              <tr key={t.id} className="border-b border-slate-100 last:border-0 dark:border-slate-700/60">
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{t.date}</td>
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{t.fromAccountName}</td>
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{t.toAccountName}</td>
                <td className="px-4 py-3 text-right font-semibold text-indigo-600">{fmtMoney(t.amount, cur)}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{t.notes}</td>
                <td className="px-4 py-3 text-right"><button onClick={() => remove(t.id)} className="text-xs text-rose-500">Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {transfers.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-400 dark:border-slate-700">No transfers yet.</div>}
        {transfers.map(t => (
          <Card key={t.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-400">{t.date}</div>
              <span className="font-bold text-indigo-600">{fmtMoney(t.amount, cur)}</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100">
              <span>{t.fromAccountName}</span><span className="text-slate-400">→</span><span>{t.toAccountName}</span>
            </div>
            {t.notes && <div className="mt-1 text-xs text-slate-400">{t.notes}</div>}
            <button onClick={() => remove(t.id)} className="mt-2 text-xs text-rose-500">Delete</button>
          </Card>
        ))}
      </div>

      <Modal open={modal} title="New Transfer" onClose={() => setModal(false)}>
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">From Account</span>
            <select value={form.fromAccountId} onChange={e => setForm({...form, fromAccountId:e.target.value})}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white">
              <option value="">Select account...</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({fmtMoney(a.currentBalance, cur)})</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">To Account</span>
            <select value={form.toAccountId} onChange={e => setForm({...form, toAccountId:e.target.value})}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white">
              <option value="">Select account...</option>
              {accounts.filter(a => a.id !== form.fromAccountId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
          <Input label="Amount" type="number" value={form.amount} onChange={e => setForm({...form, amount:e.target.value})} placeholder="0" />
          <Input label="Date" type="date" value={form.date} onChange={e => setForm({...form, date:e.target.value})} />
          <Input label="Notes (optional)" value={form.notes} onChange={e => setForm({...form, notes:e.target.value})} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button onClick={save}>Save Transfer</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

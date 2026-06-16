import React, { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../api";
import { Button, Card, Input, Modal, fmtMoney } from "../components/ui";

const TYPES = ["cash","bank","mobile_wallet","crypto","other"];
const TYPE_LABELS = { cash:"Cash",bank:"Bank",mobile_wallet:"Mobile Wallet",crypto:"Crypto",other:"Other" };
const TYPE_ICONS = { cash:"💵",bank:"🏦",mobile_wallet:"📱",crypto:"₿",other:"🏷" };

export default function Accounts() {
  const { activeId, activeBusiness } = useApp();
  const cur = activeBusiness?.currency || "PKR";
  const [accounts, setAccounts] = useState([]);
  const [modal, setModal] = useState(null);
  const empty = { name:"", type:"cash", openingBalance:"" };
  const [form, setForm] = useState(empty);

  const load = async () => { if (activeId) setAccounts(await api.listAccounts(activeId)); };
  useEffect(() => { load(); }, [activeId]);

  const save = async () => {
    if (!form.name.trim()) return alert("Account name required");
    if (modal?.id) await api.updateAccount(activeId, modal.id, form);
    else await api.createAccount(activeId, form);
    setModal(null); load();
  };

  const remove = async (a) => {
    if (!confirm(`Archive "${a.name}"? It will be hidden but its history is kept.`)) return;
    await api.deleteAccount(activeId, a.id); load();
  };

  const totalBalance = accounts.reduce((s, a) => s + (a.currentBalance || 0), 0);

  if (!activeId) return <div className="p-6 text-slate-400">Select a business first.</div>;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Accounts</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Cash, bank, wallets — track every account.</p>
        </div>
        <Button onClick={() => { setForm(empty); setModal({}); }}>+ New Account</Button>
      </div>

      {/* Total */}
      <Card className="mb-5 flex items-center justify-between p-5">
        <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">Total Across All Accounts</div>
        <div className={`text-2xl font-bold ${totalBalance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
          {fmtMoney(totalBalance, cur)}
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-400 dark:border-slate-700">
            No accounts yet. Add your first account (e.g. Cash in Hand, HBL Bank).
          </div>
        )}
        {accounts.map(a => (
          <Card key={a.id} className="p-5">
            <div className="mb-3 flex items-center gap-3">
              <span className="text-2xl">{TYPE_ICONS[a.type] || "🏷"}</span>
              <div>
                <div className="font-bold text-slate-900 dark:text-white">{a.name}</div>
                <div className="text-xs text-slate-400">{TYPE_LABELS[a.type] || a.type}</div>
              </div>
            </div>
            <div className="mb-1 flex justify-between text-xs text-slate-400">
              <span>Opening</span><span>{fmtMoney(a.openingBalance, cur)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-slate-600 dark:text-slate-300">Current Balance</span>
              <span className={a.currentBalance >= 0 ? "text-emerald-600" : "text-rose-600"}>
                {fmtMoney(a.currentBalance, cur)}
              </span>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => { setForm({ name:a.name, type:a.type, openingBalance:a.openingBalance }); setModal(a); }}
                className="flex-1 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">Edit</button>
              <button onClick={() => remove(a)}
                className="rounded-md px-3 py-1.5 text-xs font-semibold text-rose-500">Archive</button>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={!!modal} title={modal?.id ? "Edit Account" : "New Account"} onClose={() => setModal(null)}>
        <div className="space-y-4">
          <Input label="Account Name" value={form.name} onChange={e => setForm({...form, name:e.target.value})} placeholder="e.g. Cash in Hand, HBL Account" />
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Account Type</span>
            <select value={form.type} onChange={e => setForm({...form, type:e.target.value})}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white">
              {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
          </label>
          <Input label={modal?.id ? "Opening Balance (editing won't change transactions)" : "Opening Balance"}
            type="number" value={form.openingBalance} onChange={e => setForm({...form, openingBalance:e.target.value})} placeholder="0" />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

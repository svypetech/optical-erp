import React, { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../api";

export default function AccountSelector({ value, onChange, label = "Account" }) {
  const { activeId } = useApp();
  const [accounts, setAccounts] = useState([]);
  useEffect(() => {
    if (!activeId) return;
    api.listAccounts(activeId).then(setAccounts).catch(() => {});
  }, [activeId]);

  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</span>
      <select value={value || ""} onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white">
        <option value="">-- No account selected --</option>
        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
    </label>
  );
}

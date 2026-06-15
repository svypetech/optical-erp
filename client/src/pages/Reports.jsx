import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../api";
import { Card, Input, Button, fmtMoney } from "../components/ui";

const TABS = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
];

// Map a grouped period key to a comparable YYYY-MM-DD-ish bound for filtering.
// daily key: 2026-06-13 | weekly key: 2026-W24 | monthly key: 2026-06
function keyInRange(key, tab, from, to) {
  if (!from && !to) return true;
  if (tab === "daily") {
    if (from && key < from) return false;
    if (to && key > to) return false;
    return true;
  }
  if (tab === "monthly") {
    const fromM = from ? from.slice(0, 7) : null;
    const toM = to ? to.slice(0, 7) : null;
    if (fromM && key < fromM) return false;
    if (toM && key > toM) return false;
    return true;
  }
  // weekly: compare ISO week of the bound dates
  const wk = (d) => {
    const dt = new Date(d + "T00:00:00");
    const tmp = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()));
    const dayNum = (tmp.getUTCDay() + 6) % 7;
    tmp.setUTCDate(tmp.getUTCDate() - dayNum + 3);
    const firstThu = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 4));
    const week = 1 + Math.round(((tmp - firstThu) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
    return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
  };
  if (from && key < wk(from)) return false;
  if (to && key > wk(to)) return false;
  return true;
}

export default function Reports() {
  const { activeId, activeBusiness } = useApp();
  const cur = activeBusiness?.currency || "USD";
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("daily");
  const [range, setRange] = useState({ from: "", to: "" });

  useEffect(() => {
    if (!activeId) return;
    api.summary(activeId).then(setData).catch(() => {});
  }, [activeId]);

  const rows = useMemo(() => {
    if (!data) return [];
    return data[tab].filter((r) => keyInRange(r.key, tab, range.from, range.to));
  }, [data, tab, range]);

  const totals = useMemo(() => {
    const income = rows.reduce((a, r) => a + r.income, 0);
    const expenses = rows.reduce((a, r) => a + r.expenses, 0);
    return { income, expenses, profit: income - expenses };
  }, [rows]);

  if (!activeId)
    return (
      <div className="grid h-64 place-items-center rounded-2xl border border-dashed border-slate-300 text-slate-500 dark:border-slate-700 dark:text-slate-400">
        Create a business first.
      </div>
    );

  const label = (k) =>
    tab === "monthly"
      ? new Date(k + "-01T00:00:00").toLocaleDateString(undefined, { month: "long", year: "numeric" })
      : k;

  return (
    <div>
      <h1 className="mb-5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        Reports
      </h1>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={
                "rounded-md px-4 py-1.5 text-sm font-semibold transition " +
                (tab === t.key ? "bg-indigo-600 text-white" : "text-slate-600 dark:text-slate-300")
              }
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="w-40">
          <Input label="From" type="date" value={range.from}
            onChange={(e) => setRange({ ...range, from: e.target.value })} />
        </div>
        <div className="w-40">
          <Input label="To" type="date" value={range.to}
            onChange={(e) => setRange({ ...range, to: e.target.value })} />
        </div>
        {(range.from || range.to) && (
          <Button variant="ghost" onClick={() => setRange({ from: "", to: "" })}>Clear</Button>
        )}
      </div>

      {/* range totals */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card><div className="text-sm font-medium text-slate-500 dark:text-slate-400">Revenue</div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">{fmtMoney(totals.income, cur)}</div></Card>
        <Card><div className="text-sm font-medium text-slate-500 dark:text-slate-400">Expenses</div>
          <div className="mt-2 text-2xl font-bold text-rose-600">{fmtMoney(totals.expenses, cur)}</div></Card>
        <Card><div className="text-sm font-medium text-slate-500 dark:text-slate-400">Profit</div>
          <div className={"mt-2 text-2xl font-bold " + (totals.profit >= 0 ? "text-indigo-600" : "text-rose-600")}>
            {fmtMoney(totals.profit, cur)}</div></Card>
      </div>

      <Card className="hidden overflow-x-auto p-0 md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3 text-right">Income</th>
              <th className="px-4 py-3 text-right">Expenses</th>
              <th className="px-4 py-3 text-right">Profit</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400">No data for this range.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-slate-100 text-slate-700 last:border-0 dark:border-slate-700/60 dark:text-slate-200">
                <td className="px-4 py-3 font-medium">{label(r.key)}</td>
                <td className="px-4 py-3 text-right text-emerald-600">{fmtMoney(r.income, cur)}</td>
                <td className="px-4 py-3 text-right text-rose-600">{fmtMoney(r.expenses, cur)}</td>
                <td className={"px-4 py-3 text-right font-semibold " + (r.profit >= 0 ? "text-indigo-600" : "text-rose-600")}>
                  {fmtMoney(r.profit, cur)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Mobile: report cards */}
      <div className="space-y-3 md:hidden">
        {rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-400 dark:border-slate-700">No data for this range.</div>
        )}
        {rows.map((r) => (
          <Card key={r.key} className="p-4">
            <div className="font-semibold text-slate-900 dark:text-white">{label(r.key)}</div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
              <div><div className="text-xs text-slate-400">Income</div><div className="font-semibold text-emerald-600">{fmtMoney(r.income, cur)}</div></div>
              <div><div className="text-xs text-slate-400">Expenses</div><div className="font-semibold text-rose-600">{fmtMoney(r.expenses, cur)}</div></div>
              <div><div className="text-xs text-slate-400">Profit</div><div className={"font-semibold " + (r.profit >= 0 ? "text-indigo-600" : "text-rose-600")}>{fmtMoney(r.profit, cur)}</div></div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

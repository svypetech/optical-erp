import React, { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../api";
import { Card, fmtMoney } from "../components/ui";

const firstOfMonth = () => new Date().toISOString().slice(0,8)+"01";
const today = () => new Date().toISOString().slice(0,10);

const CAT_COLORS = {
  Business:"bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Personal:"bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  Travel:"bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  Inventory:"bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

export default function PnL() {
  const { activeId, activeBusiness } = useApp();
  const cur = activeBusiness?.currency || "PKR";
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const [data, setData] = useState(null);
  const [aging, setAging] = useState(null);
  const [tab, setTab] = useState("pnl");

  const load = async () => {
    if (!activeId) return;
    const [p, a] = await Promise.all([api.getPnl(activeId, from, to), api.getAging(activeId)]);
    setData(p); setAging(a);
  };
  useEffect(() => { load(); }, [activeId, from, to]);

  if (!activeId) return <div className="p-6 text-slate-400">Select a business first.</div>;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">P&L / Aging</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Profit & Loss by category, and receivables aging.</p>
        </div>
        <div className="flex gap-2">
          {["pnl","aging"].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={"rounded-full px-4 py-1.5 text-sm font-semibold " + (tab===t ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300")}>
              {t === "pnl" ? "P&L" : "Receivables"}
            </button>
          ))}
        </div>
      </div>

      {tab === "pnl" ? (
        <>
          <Card className="mb-5 flex flex-wrap gap-4 p-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">From</span>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">To</span>
              <input type="date" value={to} onChange={e => setTo(e.target.value)}
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
            </div>
          </Card>

          {data && (
            <div className="space-y-4">
              {/* Income */}
              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">Total Income Received</span>
                  <span className="text-xl font-bold text-emerald-600">{fmtMoney(data.income, cur)}</span>
                </div>
              </Card>

              {/* Expenses by category */}
              <Card className="p-5">
                <div className="mb-3 font-semibold text-slate-700 dark:text-slate-200">Expenses by Category</div>
                {data.expensesByCategory.length === 0 && <div className="text-sm text-slate-400">No expenses in this period.</div>}
                <div className="space-y-2">
                  {data.expensesByCategory.map(e => (
                    <div key={e.category} className="flex items-center justify-between">
                      <span className={"rounded-full px-2 py-0.5 text-xs font-semibold " + (CAT_COLORS[e.category] || "bg-slate-100 text-slate-600")}>
                        {e.category}
                      </span>
                      <span className="font-semibold text-rose-600">{fmtMoney(e.amount, cur)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2 dark:border-slate-600">
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Total Expenses</span>
                    <span className="font-bold text-rose-600">{fmtMoney(data.totalExpenses, cur)}</span>
                  </div>
                </div>
              </Card>

              {/* Net profit */}
              <Card className={"p-5 " + (data.netProfit >= 0 ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-rose-50 dark:bg-rose-900/20")}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-100">Net Profit</span>
                  <span className={"text-2xl font-bold " + (data.netProfit >= 0 ? "text-emerald-600" : "text-rose-600")}>
                    {fmtMoney(data.netProfit, cur)}
                  </span>
                </div>
              </Card>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4">
          {aging && Object.entries(aging).map(([bucket, items]) => (
            <Card key={bucket} className="overflow-hidden p-0">
              <div className={"flex items-center justify-between px-4 py-3 " +
                (bucket === "90+ days" ? "bg-rose-50 dark:bg-rose-900/20" :
                 bucket === "31-90 days" ? "bg-amber-50 dark:bg-amber-900/20" : "bg-slate-50 dark:bg-slate-800")}>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{bucket}</span>
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                  {items.length} invoice{items.length !== 1 ? "s" : ""} •{" "}
                  {fmtMoney(items.reduce((s,i)=>s+i.due,0), cur)}
                </span>
              </div>
              {items.length > 0 && (
                <table className="w-full text-sm">
                  <tbody>
                    {items.map(i => (
                      <tr key={i.invoiceNo} className="border-t border-slate-100 dark:border-slate-700/60">
                        <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">{i.customerName}</td>
                        <td className="px-4 py-2 text-slate-500">{i.invoiceNo}</td>
                        <td className="px-4 py-2 text-slate-400 text-xs">{i.daysOld}d old</td>
                        <td className="px-4 py-2 text-right font-semibold text-rose-600">{fmtMoney(i.due, cur)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

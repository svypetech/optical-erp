import React, { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../api";
import { Button, Card, fmtMoney } from "../components/ui";

const today = () => new Date().toISOString().slice(0, 10);
const TYPE_ICONS = { cash:"💵", bank:"🏦", mobile_wallet:"📱", crypto:"₿", other:"🏷" };

export default function DayClose() {
  const { activeId, activeBusiness } = useApp();
  const cur = activeBusiness?.currency || "PKR";
  const [date, setDate] = useState(today());
  const [closing, setClosing] = useState(null);
  const [actuals, setActuals] = useState({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [closing2, setClosing2] = useState(false);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState("today");

  const load = async () => {
    if (!activeId) return;
    const [c, h] = await Promise.all([api.getClosing(activeId, date), api.listClosings(activeId)]);
    setClosing(c); setHistory(h);
    const init = {};
    (c.balances || []).forEach(b => { if (b.actual !== null) init[b.accountId] = String(b.actual); });
    setActuals(init);
  };
  useEffect(() => { load(); }, [activeId, date]);

  const saveTally = async () => {
    setSaving(true);
    try {
      const entries = (closing.balances || []).map(b => ({
        accountId: b.accountId,
        actual: Number(actuals[b.accountId] || 0),
      }));
      const updated = await api.saveClosingBalances(activeId, date, entries);
      setClosing(updated);
    } finally { setSaving(false); }
  };

  const doClose = async () => {
    if (!closing?.allEntered) return alert("Enter actual balances for all accounts first.");
    const totalDiff = closing.totalDifference || 0;
    if (Math.abs(totalDiff) > 0.01) {
      const ok = confirm(`There is a difference of ${fmtMoney(Math.abs(totalDiff), cur)}. Close anyway?`);
      if (!ok) return;
    }
    setClosing2(true);
    try {
      const updated = await api.closeDay(activeId, date, notes);
      setClosing(updated); load();
    } finally { setClosing2(false); }
  };

  if (!activeId) return <div className="p-6 text-slate-400">Select a business first.</div>;

  const isClosed = closing?.status === "closed";

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Day Closing</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Tally your accounts at end of day.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab("today")}
            className={"rounded-full px-4 py-1.5 text-sm font-semibold " + (tab==="today" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300")}>
            Today's Closing
          </button>
          <button onClick={() => setTab("history")}
            className={"rounded-full px-4 py-1.5 text-sm font-semibold " + (tab==="history" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300")}>
            History
          </button>
        </div>
      </div>

      {tab === "history" ? (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <th className="px-4 py-3">Date</th><th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Difference</th><th className="px-4 py-3">Notes</th></tr></thead>
            <tbody>
              {history.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400">No closings yet.</td></tr>}
              {history.map(h => (
                <tr key={h.id} className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-700/60 dark:hover:bg-slate-700/30"
                  onClick={() => { setDate(h.date); setTab("today"); }}>
                  <td className="px-4 py-3 font-medium">{h.date}</td>
                  <td className="px-4 py-3">
                    <span className={"rounded-full px-2 py-0.5 text-xs font-semibold " + (h.status==="closed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                      {h.status === "closed" ? "✓ Closed" : "Open"}
                    </span>
                  </td>
                  <td className={"px-4 py-3 text-right font-semibold " + (Math.abs(h.difference) < 0.01 ? "text-emerald-600" : "text-rose-600")}>
                    {Math.abs(h.difference) < 0.01 ? "Balanced" : fmtMoney(h.difference, cur)}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{h.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <>
          {/* Date selector */}
          <Card className="mb-4 flex flex-wrap items-center gap-4 p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Date:</span>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
            </div>
            {isClosed && (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                ✓ Day Closed
              </span>
            )}
          </Card>

          {/* Account balances */}
          <div className="mb-4 space-y-3">
            {(!closing?.balances || closing.balances.length === 0) && (
              <Card className="p-6 text-center text-slate-400">No accounts set up yet. Add accounts first.</Card>
            )}
            {(closing?.balances || []).map(b => {
              const diff = actuals[b.accountId] !== undefined
                ? Number(actuals[b.accountId] || 0) - b.expected
                : null;
              return (
                <Card key={b.accountId} className="p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xl">{TYPE_ICONS[b.accountType] || "🏷"}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900 dark:text-white">{b.accountName}</div>
                      <div className="text-xs text-slate-400">Expected: {fmtMoney(b.expected, cur)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Actual:</span>
                      <input
                        type="number" step="0.01"
                        value={actuals[b.accountId] ?? ""}
                        onChange={e => setActuals({...actuals, [b.accountId]: e.target.value})}
                        disabled={isClosed}
                        placeholder={isClosed ? String(b.actual ?? "") : "Enter amount"}
                        className="w-32 rounded-lg border border-slate-300 px-2 py-1.5 text-right text-sm font-semibold outline-none focus:border-indigo-500 disabled:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                    {diff !== null && (
                      <span className={"w-24 text-right text-sm font-bold " + (Math.abs(diff) < 0.01 ? "text-emerald-600" : "text-rose-600")}>
                        {Math.abs(diff) < 0.01 ? "✓" : (diff > 0 ? "+" : "") + fmtMoney(diff, cur)}
                      </span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Summary */}
          {closing && closing.balances?.length > 0 && (
            <Card className="mb-4 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Total Expected</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{fmtMoney(closing.totalExpected, cur)}</span>
              </div>
              {closing.totalActual > 0 && (
                <>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Total Actual (entered)</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{fmtMoney(closing.totalActual, cur)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 dark:border-slate-600">
                    <span className="text-sm font-semibold">Difference</span>
                    <span className={"text-lg font-bold " + (Math.abs(closing.totalDifference) < 0.01 ? "text-emerald-600" : "text-rose-600")}>
                      {Math.abs(closing.totalDifference) < 0.01 ? "✓ Balanced!" : fmtMoney(closing.totalDifference, cur)}
                    </span>
                  </div>
                </>
              )}
            </Card>
          )}

          {!isClosed && (
            <div className="space-y-3">
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Notes for this closing (optional)..."
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" onClick={saveTally} disabled={saving}>
                  {saving ? "Saving..." : "💾 Save Tally"}
                </Button>
                <Button onClick={doClose} disabled={closing2}>
                  {closing2 ? "Closing..." : "✓ Close Day"}
                </Button>
              </div>
              {closing && Math.abs(closing.totalDifference || 0) > 0.01 && (
                <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">
                  ⚠️ There is a difference of {fmtMoney(Math.abs(closing.totalDifference), cur)}.
                  Check your income and expense entries to find and fix the gap, then re-tally.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

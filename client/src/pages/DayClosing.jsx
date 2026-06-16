import React, { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../api";
import { Button, Card, fmtMoney } from "../components/ui";

const today = () => new Date().toISOString().slice(0, 10);

export default function DayClosing() {
  const { activeId, activeBusiness } = useApp();
  const cur = activeBusiness?.currency || "PKR";
  const [date, setDate] = useState(today());
  const [data, setData] = useState(null); // { closing, entries, accounts, expectedMap }
  const [actuals, setActuals] = useState({}); // accountId -> string
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [history, setHistory] = useState([]);
  const [view, setView] = useState("close"); // "close" | "history"

  const load = async () => {
    if (!activeId) return;
    setLoading(true);
    try {
      const d = await api.getDayClosing(activeId, date);
      setData(d);
      // Pre-fill actuals from previous entries if already submitted
      const pre = {};
      d.entries.forEach((e) => { pre[e.accountId] = String(e.actualBalance); });
      setActuals(pre);
      setSubmitted(d.closing.status !== "Open");
      setNotes(d.closing.notes || "");
    } finally { setLoading(false); }
  };

  const loadHistory = async () => {
    if (!activeId) return;
    setHistory(await api.listClosings(activeId));
  };

  useEffect(() => { load().catch(() => {}); }, [activeId, date]);
  useEffect(() => { if (view === "history") loadHistory().catch(() => {}); }, [view, activeId]);

  const submit = async () => {
    if (!data) return;
    const actualEntries = data.accounts.map((a) => ({
      accountId: a.id,
      actualBalance: Number(actuals[a.id]) || 0,
    }));
    setLoading(true);
    try {
      const result = await api.submitClosing(activeId, date, { actualEntries, notes });
      setData(result);
      setSubmitted(true);
    } finally { setLoading(false); }
  };

  const expectedTotal = data ? Object.values(data.expectedMap || {}).reduce((s, v) => s + v, 0) : 0;
  const actualTotal = data ? data.accounts.reduce((s, a) => s + (Number(actuals[a.id]) || 0), 0) : 0;
  const difference = actualTotal - expectedTotal;

  if (!activeId) return (
    <div className="grid h-64 place-items-center rounded-2xl border border-dashed border-slate-300 text-slate-500 dark:border-slate-700">
      Create a business first.
    </div>
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Day Closing</h1>
        <div className="flex-1" />
        <div className="flex rounded-lg border border-slate-300 dark:border-slate-600">
          {["close", "history"].map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={"px-4 py-2 text-sm font-semibold capitalize " +
                (view === v ? "bg-indigo-600 text-white" : "text-slate-600 dark:text-slate-300")}>
              {v === "close" ? "Close Day" : "History"}
            </button>
          ))}
        </div>
      </div>

      {view === "history" ? (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <th className="px-4 py-3">Date</th><th className="px-4 py-3 text-right">Expected</th>
              <th className="px-4 py-3 text-right">Actual</th><th className="px-4 py-3 text-right">Difference</th>
              <th className="px-4 py-3">Status</th></tr></thead>
            <tbody>
              {history.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No closings yet.</td></tr>}
              {history.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0 dark:border-slate-700/60">
                  <td className="px-4 py-3 font-medium">{c.date}</td>
                  <td className="px-4 py-3 text-right">{fmtMoney(c.expectedTotal, cur)}</td>
                  <td className="px-4 py-3 text-right">{fmtMoney(c.actualTotal, cur)}</td>
                  <td className={"px-4 py-3 text-right font-semibold " + (Math.abs(c.difference) < 0.01 ? "text-emerald-600" : "text-rose-600")}>
                    {c.difference > 0 ? "+" : ""}{fmtMoney(c.difference, cur)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={"rounded-full px-2 py-0.5 text-xs font-semibold " +
                      (c.status === "Balanced" ? "bg-emerald-100 text-emerald-700" : c.status === "Open" ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-700")}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <>
          {/* Date picker */}
          <Card className="mb-5">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Closing Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
              </div>
              {submitted && (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  Day Closed
                </span>
              )}
            </div>
          </Card>

          {loading && <div className="py-10 text-center text-slate-400">Loading...</div>}

          {!loading && data && (
            <>
              {data.accounts.length === 0 && (
                <Card className="py-10 text-center text-slate-400">
                  No accounts set up yet. Go to Accounts to create your cash, bank and other accounts first.
                </Card>
              )}

              {data.accounts.length > 0 && (
                <>
                  {/* Tally table */}
                  <Card className="mb-5 overflow-x-auto p-0">
                    <div className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300">
                      Enter Physical Count — what do you actually have?
                    </div>
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        <th className="px-4 py-3">Account</th>
                        <th className="px-4 py-3 text-right">Expected</th>
                        <th className="px-4 py-3 text-right">Actual (you enter)</th>
                        <th className="px-4 py-3 text-right">Difference</th>
                      </tr></thead>
                      <tbody>
                        {data.accounts.map((a) => {
                          const exp = data.expectedMap[a.id] || 0;
                          const act = Number(actuals[a.id]) || 0;
                          const diff = act - exp;
                          return (
                            <tr key={a.id} className="border-b border-slate-100 last:border-0 dark:border-slate-700/60">
                              <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{a.name}</td>
                              <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{fmtMoney(exp, cur)}</td>
                              <td className="px-4 py-3 text-right">
                                <input
                                  type="number"
                                  value={actuals[a.id] ?? ""}
                                  onChange={(e) => setActuals({ ...actuals, [a.id]: e.target.value })}
                                  disabled={submitted}
                                  className="w-32 rounded-lg border border-slate-300 px-2 py-1 text-right text-sm disabled:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                                  placeholder="0"
                                />
                              </td>
                              <td className={"px-4 py-3 text-right font-semibold " + (Math.abs(diff) < 0.01 ? "text-emerald-600" : "text-rose-600")}>
                                {actuals[a.id] !== undefined ? (diff >= 0 ? "+" : "") + fmtMoney(diff, cur) : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-300 font-bold dark:border-slate-600">
                          <td className="px-4 py-3 text-slate-900 dark:text-white">Total</td>
                          <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{fmtMoney(expectedTotal, cur)}</td>
                          <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{fmtMoney(actualTotal, cur)}</td>
                          <td className={"px-4 py-3 text-right " + (Math.abs(difference) < 0.01 ? "text-emerald-600" : "text-rose-600")}>
                            {difference >= 0 ? "+" : ""}{fmtMoney(difference, cur)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </Card>

                  {/* Difference warning */}
                  {!submitted && Math.abs(difference) > 0.01 && (
                    <Card className="mb-5 border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20">
                      <div className="font-semibold text-amber-800 dark:text-amber-300">
                        Difference of {fmtMoney(Math.abs(difference), cur)} detected
                      </div>
                      <div className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                        {difference > 0
                          ? "You have more cash than expected. Check if an income was not recorded."
                          : "You have less cash than expected. Check if an expense was not recorded."}
                      </div>
                      <div className="mt-2 text-sm text-amber-700 dark:text-amber-400">
                        You can still close the day with a difference - it will be recorded. Or go to Income/Expenses to fix the entries first.
                      </div>
                    </Card>
                  )}

                  {/* Balanced message */}
                  {!submitted && Math.abs(difference) < 0.01 && data.accounts.some((a) => actuals[a.id] !== undefined) && (
                    <Card className="mb-5 border border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20">
                      <div className="font-semibold text-emerald-700 dark:text-emerald-300">
                        Tally balanced! Your books match exactly.
                      </div>
                    </Card>
                  )}

                  {/* Notes and submit */}
                  {!submitted && (
                    <Card className="mb-5">
                      <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Closing Notes (optional)</label>
                      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                        placeholder="Any notes for this day's closing..." />
                      <div className="mt-3 flex justify-end">
                        <Button onClick={submit} disabled={loading}>
                          {loading ? "Saving..." : "Close Day & Save Tally"}
                        </Button>
                      </div>
                    </Card>
                  )}

                  {submitted && (
                    <Card className="border border-emerald-300 bg-emerald-50 p-4 text-center dark:border-emerald-700 dark:bg-emerald-900/20">
                      <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">Day Closed</div>
                      <div className="text-sm text-emerald-600 dark:text-emerald-400">
                        Status: {data.closing.status} | Difference: {fmtMoney(data.closing.difference, cur)}
                      </div>
                      {notes && <div className="mt-1 text-sm text-slate-500">{notes}</div>}
                      <button onClick={() => { setSubmitted(false); }}
                        className="mt-3 text-xs text-indigo-600 hover:underline">
                        Edit / Re-submit this closing
                      </button>
                    </Card>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

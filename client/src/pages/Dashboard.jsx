import React, { useEffect, useMemo, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useApp } from "../context/AppContext";
import { api } from "../api";
import { Stat, Card, Button, Modal, Input, fmtMoney } from "../components/ui";

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function Dashboard() {
  const { activeBusiness, activeId } = useApp();
  const [stats, setStats] = useState(null);     // all-time + today, from backend
  const [daily, setDaily] = useState([]);        // full daily summary [{key,income,expenses,netIncome}]
  const [csvOpen, setCsvOpen] = useState(false);
  const [range, setRange] = useState({ from: "", to: "" });   // dashboard view filter
  const [csvRange, setCsvRange] = useState({ from: "", to: "" }); // export dialog
  const cur = activeBusiness?.currency || "USD";

  const load = async () => {
    if (!activeId) return;
    const [d, s] = await Promise.all([api.dashboard(activeId), api.summary(activeId)]);
    setStats(d);
    setDaily(s.daily); // newest-first from backend
  };

  useEffect(() => {
    load().catch(() => {});
  }, [activeId]);

  // Apply the dashboard date filter to the daily summary.
  const filtered = useMemo(() => {
    return daily.filter((g) => {
      if (range.from && g.key < range.from) return false;
      if (range.to && g.key > range.to) return false;
      return true;
    });
  }, [daily, range]);

  const rangeTotals = useMemo(() => {
    const income = filtered.reduce((a, g) => a + g.income, 0);
    const expenses = filtered.reduce((a, g) => a + g.expenses, 0);
    return { income, expenses, netIncome: income - expenses };
  }, [filtered]);

  const rangeActive = !!(range.from || range.to);

  // Chart: oldest-first, last 14 points when no filter, else the whole filtered set.
  const series = useMemo(() => {
    const base = rangeActive ? filtered : daily.slice(0, 14);
    return [...base]
      .sort((a, b) => (a.key < b.key ? -1 : 1))
      .map((g) => ({ date: g.key.slice(5), Income: g.income, Expenses: g.expenses }));
  }, [filtered, daily, rangeActive]);

  const exportXlsx = async () => {
    await api.download(activeId, "xlsx", `${activeBusiness.name}.xlsx`);
  };

  const openCsv = () => {
    // pre-fill the export dialog with the current dashboard filter
    setCsvRange({ from: range.from, to: range.to });
    setCsvOpen(true);
  };

  const exportCsvRange = async () => {
    await api.download(activeId, "csv", `${activeBusiness.name}.csv`, {
      from: csvRange.from,
      to: csvRange.to,
    });
    setCsvOpen(false);
  };

  if (!activeId)
    return <Empty text="No business selected. Create one under Businesses to get started." />;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {activeBusiness?.name}
        </h1>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
          {cur}
        </span>
        <div className="flex-1" />
        <Button variant="secondary" onClick={exportXlsx}>Export Excel</Button>
        <Button variant="secondary" onClick={openCsv}>Export CSV</Button>
      </div>

      {/* date range filter */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-40">
            <Input label="From" type="date" value={range.from}
              onChange={(e) => setRange({ ...range, from: e.target.value })} />
          </div>
          <div className="w-40">
            <Input label="To" type="date" value={range.to}
              onChange={(e) => setRange({ ...range, to: e.target.value })} />
          </div>
          {rangeActive && (
            <Button variant="ghost" onClick={() => setRange({ from: "", to: "" })}>
              Clear filter
            </Button>
          )}
          <div className="flex-1" />
          <span className="text-xs text-slate-400">
            {rangeActive ? "Showing selected range" : "Showing today + all-time"}
          </span>
        </div>
      </Card>

      {/* When a range is active, show range cards; otherwise show today's cards */}
      {rangeActive ? (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat label="Range Income" value={fmtMoney(rangeTotals.income, cur)} accent="text-emerald-600" />
          <Stat label="Range Expenses" value={fmtMoney(rangeTotals.expenses, cur)} accent="text-rose-600" />
          <Stat label="Range Net Income" value={fmtMoney(rangeTotals.netIncome, cur)}
            accent={rangeTotals.netIncome >= 0 ? "text-indigo-600" : "text-rose-600"} />
        </div>
      ) : (
        stats && (
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Stat label="Today's Income" value={fmtMoney(stats.todayIncome, cur)} accent="text-emerald-600" />
              <Stat label="Today's Expenses" value={fmtMoney(stats.todayExpenses, cur)} accent="text-rose-600" />
              <Stat label="Today's Net Income" value={fmtMoney(stats.todayNetIncome, cur)}
                accent={stats.todayNetIncome >= 0 ? "text-indigo-600" : "text-rose-600"} />
            </div>
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Stat label="Total Revenue" value={fmtMoney(stats.totalRevenue, cur)} accent="text-emerald-600" />
              <Stat label="Total Expenses" value={fmtMoney(stats.totalExpenses, cur)} accent="text-rose-600" />
              <Stat label="Total Net Income" value={fmtMoney(stats.totalNetIncome, cur)}
                accent={stats.totalNetIncome >= 0 ? "text-indigo-600" : "text-rose-600"} />
            </div>
          </>
        )
      )}

      <Card>
        <div className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-200">
          {rangeActive ? "Selected range" : "Last 14 days"}
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={series}>
            <defs>
              <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="ge" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
            <XAxis dataKey="date" fontSize={11} stroke="#94a3b8" />
            <YAxis fontSize={11} stroke="#94a3b8" />
            <Tooltip />
            <Area type="monotone" dataKey="Income" stroke="#10b981" fill="url(#gi)" strokeWidth={2} />
            <Area type="monotone" dataKey="Expenses" stroke="#ef4444" fill="url(#ge)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <Modal open={csvOpen} title="Export CSV - choose date range" onClose={() => setCsvOpen(false)}>
        <div className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Leave a field blank to include everything before/after the other date.
          </p>
          <Input label="From" type="date" value={csvRange.from}
            onChange={(e) => setCsvRange({ ...csvRange, from: e.target.value })} />
          <Input label="To" type="date" value={csvRange.to}
            onChange={(e) => setCsvRange({ ...csvRange, to: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setCsvOpen(false)}>Cancel</Button>
            <Button onClick={exportCsvRange}>Download CSV</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="grid h-64 place-items-center rounded-2xl border border-dashed border-slate-300 text-slate-500 dark:border-slate-700 dark:text-slate-400">
      {text}
    </div>
  );
}

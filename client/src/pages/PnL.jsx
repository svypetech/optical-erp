import React, { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../api";
import { Card, Button, Input, Modal, fmtMoney } from "../components/ui";

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

  // Loans
  const [loans, setLoans] = useState([]);
  const [loanFilter, setLoanFilter] = useState("open"); // open | settled | all
  const [loanSummary, setLoanSummary] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loanModal, setLoanModal] = useState(null); // null | {} (new) | loan obj (edit)
  const [loanForm, setLoanForm] = useState({ type: "lent", personName: "", amount: "", date: today(), accountId: "", notes: "" });
  const [payModal, setPayModal] = useState(null); // loan being repaid
  const [payForm, setPayForm] = useState({ amount: "", date: today(), accountId: "", notes: "" });

  const load = async () => {
    if (!activeId) return;
    const [p, a] = await Promise.all([api.getPnl(activeId, from, to), api.getAging(activeId)]);
    setData(p); setAging(a);
  };
  useEffect(() => { load(); }, [activeId, from, to]);

  const loadLoans = async () => {
    if (!activeId) return;
    const [l, s, accs] = await Promise.all([
      api.listLoans(activeId, loanFilter === "all" ? {} : { status: loanFilter }),
      api.getLoanSummary(activeId),
      api.listAccounts(activeId),
    ]);
    setLoans(l); setLoanSummary(s); setAccounts(accs);
  };
  useEffect(() => { if (tab === "loans") loadLoans(); }, [activeId, tab, loanFilter]);

  const openNewLoan = (type) => {
    setLoanForm({ type, personName: "", amount: "", date: today(), accountId: accounts[0]?.id || "", notes: "" });
    setLoanModal({});
  };

  const saveLoan = async () => {
    if (!loanForm.personName.trim()) return alert("Person name is required.");
    if (!loanForm.amount || Number(loanForm.amount) <= 0) return alert("Enter a valid amount.");
    await api.createLoan(activeId, loanForm);
    setLoanModal(null);
    await loadLoans();
  };

  const openRepay = (loan) => {
    setPayForm({ amount: "", date: today(), accountId: accounts[0]?.id || "", notes: "" });
    setPayModal(loan);
  };

  const savePayment = async () => {
    if (!payForm.amount || Number(payForm.amount) <= 0) return alert("Enter a valid amount.");
    await api.addLoanPayment(activeId, payModal.id, payForm);
    setPayModal(null);
    await loadLoans();
  };

  const removeLoan = async (loan) => {
    if (!confirm(`Delete this ${loan.type === "lent" ? "lending" : "borrowing"} record for ${loan.personName}? This cannot be undone.`)) return;
    await api.deleteLoan(activeId, loan.id);
    await loadLoans();
  };

  if (!activeId) return <div className="p-6 text-slate-400">Select a business first.</div>;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Income / Aging / Loans</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Income by category, receivables aging, and money lent or borrowed.</p>
        </div>
        <div className="flex gap-2">
          {["pnl","aging","loans"].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={"rounded-full px-4 py-1.5 text-sm font-semibold " + (tab===t ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300")}>
              {t === "pnl" ? "Income" : t === "aging" ? "Receivables" : "Loans"}
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

              {/* Net income */}
              <Card className={"p-5 " + (data.netIncome >= 0 ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-rose-50 dark:bg-rose-900/20")}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-100">Net Income</span>
                  <span className={"text-2xl font-bold " + (data.netIncome >= 0 ? "text-emerald-600" : "text-rose-600")}>
                    {fmtMoney(data.netIncome, cur)}
                  </span>
                </div>
              </Card>
            </div>
          )}
        </>
      ) : tab === "aging" ? (
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
      ) : (
        <div className="space-y-4">
          {/* Loan summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card className="bg-emerald-50 p-5 dark:bg-emerald-900/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Receivable (money owed to me)</div>
                  <div className="mt-1 text-2xl font-bold text-emerald-600">{fmtMoney(loanSummary?.totalReceivable || 0, cur)}</div>
                </div>
                <Button onClick={() => openNewLoan("lent")}>+ Lend Money</Button>
              </div>
            </Card>
            <Card className="bg-rose-50 p-5 dark:bg-rose-900/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Payable (money I owe)</div>
                  <div className="mt-1 text-2xl font-bold text-rose-600">{fmtMoney(loanSummary?.totalPayable || 0, cur)}</div>
                </div>
                <Button variant="secondary" onClick={() => openNewLoan("borrowed")}>+ Borrow Money</Button>
              </div>
            </Card>
          </div>

          {/* Filter */}
          <div className="flex gap-2">
            {["open","settled","all"].map(f => (
              <button key={f} onClick={() => setLoanFilter(f)}
                className={"rounded-full px-3 py-1 text-xs font-semibold " + (loanFilter===f ? "bg-slate-700 text-white dark:bg-slate-600" : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300")}>
                {f === "open" ? "Open" : f === "settled" ? "Settled" : "All"}
              </button>
            ))}
          </div>

          {/* Loans list */}
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <th className="px-4 py-3">Person</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3">Status</th>
                <th />
              </tr></thead>
              <tbody>
                {loans.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">No records yet.</td></tr>}
                {loans.map(l => (
                  <tr key={l.id} className="border-b border-slate-100 last:border-0 dark:border-slate-700/60">
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{l.personName}</td>
                    <td className="px-4 py-3">
                      <span className={"rounded-full px-2 py-0.5 text-xs font-semibold " +
                        (l.type === "lent" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                            : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300")}>
                        {l.type === "lent" ? "I lent" : "I borrowed"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{l.date}</td>
                    <td className="px-4 py-3 text-right">{fmtMoney(l.amount, cur)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600">{fmtMoney(l.paid, cur)}</td>
                    <td className={"px-4 py-3 text-right font-semibold " + (l.balance > 0 ? "text-rose-600" : "text-slate-400")}>
                      {fmtMoney(l.balance, cur)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={"rounded-full px-2 py-0.5 text-xs font-semibold " +
                        (l.status === "open" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                              : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300")}>
                        {l.status === "open" ? "Open" : "Settled"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {l.status === "open" && l.balance > 0 && (
                          <button onClick={() => openRepay(l)}
                            className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-300">
                            {l.type === "lent" ? "Record Repayment" : "Pay Back"}
                          </button>
                        )}
                        <button onClick={() => removeLoan(l)}
                          className="rounded-md bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-100 dark:bg-rose-900/30">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* New loan modal */}
      <Modal open={!!loanModal} title={loanForm.type === "lent" ? "Lend Money" : "Borrow Money"} onClose={() => setLoanModal(null)}>
        <div className="space-y-4">
          <Input label={loanForm.type === "lent" ? "Lending to (person name)" : "Borrowing from (person name)"}
            value={loanForm.personName} onChange={e => setLoanForm({ ...loanForm, personName: e.target.value })} />
          <Input label="Amount" type="number" value={loanForm.amount}
            onChange={e => setLoanForm({ ...loanForm, amount: e.target.value })} />
          <Input label="Date" type="date" value={loanForm.date}
            onChange={e => setLoanForm({ ...loanForm, date: e.target.value })} />
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
              {loanForm.type === "lent" ? "Pay from account" : "Receive into account"}
            </span>
            <select value={loanForm.accountId} onChange={e => setLoanForm({ ...loanForm, accountId: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white">
              <option value="">No account (don't affect balances)</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
          <Input label="Notes (optional)" value={loanForm.notes} onChange={e => setLoanForm({ ...loanForm, notes: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setLoanModal(null)}>Cancel</Button>
            <Button onClick={saveLoan}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* Repayment modal */}
      <Modal open={!!payModal} title={payModal ? `${payModal.type === "lent" ? "Record Repayment from" : "Pay Back"} ${payModal.personName}` : ""} onClose={() => setPayModal(null)}>
        <div className="space-y-4">
          {payModal && (
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              Remaining balance: <span className="font-bold">{fmtMoney(payModal.balance, cur)}</span>
            </div>
          )}
          <Input label="Amount" type="number" value={payForm.amount}
            onChange={e => setPayForm({ ...payForm, amount: e.target.value })} />
          <Input label="Date" type="date" value={payForm.date}
            onChange={e => setPayForm({ ...payForm, date: e.target.value })} />
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
              {payModal?.type === "lent" ? "Receive into account" : "Pay from account"}
            </span>
            <select value={payForm.accountId} onChange={e => setPayForm({ ...payForm, accountId: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white">
              <option value="">No account (don't affect balances)</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
          <Input label="Notes (optional)" value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setPayModal(null)}>Cancel</Button>
            <Button onClick={savePayment}>Save Payment</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

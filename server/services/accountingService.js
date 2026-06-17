const db = require("./db");
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const todayStr = () => new Date().toISOString().slice(0, 10);

const EXPENSE_CATEGORIES = ["Business", "Personal", "Travel", "Inventory"];
const ACCOUNT_TYPES = ["cash", "bank", "mobile_wallet", "crypto", "other"];

// ── helpers ──────────────────────────────────────────────────────────────────
function mapAccount(r) {
  if (!r) return null;
  return {
    id: r.id, businessId: r.business_id, name: r.name,
    type: r.type, openingBalance: Number(r.opening_balance) || 0,
    isActive: r.is_active !== 0, createdAt: r.created_at,
  };
}
function mapTransfer(r) {
  if (!r) return null;
  return {
    id: r.id, businessId: r.business_id,
    fromAccountId: r.from_account_id, toAccountId: r.to_account_id,
    fromAccountName: r.from_account_name || "",
    toAccountName: r.to_account_name || "",
    amount: Number(r.amount) || 0, date: r.date, notes: r.notes || "",
    createdAt: r.created_at,
  };
}
function mapClosing(r) {
  if (!r) return null;
  return {
    id: r.id, businessId: r.business_id, date: r.date,
    status: r.status, notes: r.notes || "",
    difference: Number(r.difference) || 0,
    closedAt: r.closed_at || "", createdAt: r.created_at,
  };
}

// ── account balance calculation ───────────────────────────────────────────────
// Expected balance = opening + money in - money out (all transactions for this account)
function calcExpectedBalance(businessId, accountId) {
  const acc = db.prepare("SELECT * FROM accounts WHERE id=?").get(accountId);
  if (!acc) return 0;
  const opening = Number(acc.opening_balance) || 0;

  // Money IN: payments received into this account, manual income into this account
  const paymentsIn = Number(db.prepare(
    "SELECT COALESCE(SUM(amount),0) t FROM payments WHERE business_id=? AND account_id=?"
  ).get(businessId, accountId).t) || 0;
  const incomeIn = Number(db.prepare(
    "SELECT COALESCE(SUM(amount),0) t FROM income WHERE business_id=? AND account_id=?"
  ).get(businessId, accountId).t) || 0;
  const transfersIn = Number(db.prepare(
    "SELECT COALESCE(SUM(amount),0) t FROM account_transfers WHERE business_id=? AND to_account_id=?"
  ).get(businessId, accountId).t) || 0;
  // Borrowed money coming into this account (someone lent me cash)
  const borrowedIn = Number(db.prepare(
    "SELECT COALESCE(SUM(amount),0) t FROM loans WHERE business_id=? AND account_id=? AND type='borrowed'"
  ).get(businessId, accountId).t) || 0;
  // Repayments I receive for money I lent out
  const loanRepaymentsIn = Number(db.prepare(
    `SELECT COALESCE(SUM(lp.amount),0) t FROM loan_payments lp
     JOIN loans l ON l.id = lp.loan_id
     WHERE lp.business_id=? AND lp.account_id=? AND l.type='lent'`
  ).get(businessId, accountId).t) || 0;

  // Money OUT: expenses paid from this account, transfers out
  const expensesOut = Number(db.prepare(
    "SELECT COALESCE(SUM(amount),0) t FROM expenses WHERE business_id=? AND account_id=?"
  ).get(businessId, accountId).t) || 0;
  const transfersOut = Number(db.prepare(
    "SELECT COALESCE(SUM(amount),0) t FROM account_transfers WHERE business_id=? AND from_account_id=?"
  ).get(businessId, accountId).t) || 0;
  // Money lent out from this account
  const lentOut = Number(db.prepare(
    "SELECT COALESCE(SUM(amount),0) t FROM loans WHERE business_id=? AND account_id=? AND type='lent'"
  ).get(businessId, accountId).t) || 0;
  // Repayments I make for money I borrowed
  const loanRepaymentsOut = Number(db.prepare(
    `SELECT COALESCE(SUM(lp.amount),0) t FROM loan_payments lp
     JOIN loans l ON l.id = lp.loan_id
     WHERE lp.business_id=? AND lp.account_id=? AND l.type='borrowed'`
  ).get(businessId, accountId).t) || 0;

  return opening + paymentsIn + incomeIn + transfersIn + borrowedIn + loanRepaymentsIn
       - expensesOut - transfersOut - lentOut - loanRepaymentsOut;
}

// ── ACCOUNTS ─────────────────────────────────────────────────────────────────
function listAccounts(businessId) {
  const rows = db.prepare(
    "SELECT * FROM accounts WHERE business_id=? AND is_active=1 ORDER BY created_at"
  ).all(businessId);
  return rows.map(r => ({
    ...mapAccount(r),
    currentBalance: calcExpectedBalance(businessId, r.id),
  }));
}

function createAccount(businessId, { name, type, openingBalance }) {
  const id = newId();
  db.prepare(
    "INSERT INTO accounts (id,business_id,name,type,opening_balance,is_active,created_at) VALUES (?,?,?,?,?,1,?)"
  ).run(id, businessId, name, type || "cash", Number(openingBalance) || 0, new Date().toISOString());
  return { ...mapAccount(db.prepare("SELECT * FROM accounts WHERE id=?").get(id)), currentBalance: Number(openingBalance) || 0 };
}

function updateAccount(businessId, id, patch) {
  const cur = db.prepare("SELECT * FROM accounts WHERE id=? AND business_id=?").get(id, businessId);
  if (!cur) return null;
  db.prepare("UPDATE accounts SET name=?,type=?,opening_balance=? WHERE id=?")
    .run(patch.name ?? cur.name, patch.type ?? cur.type,
      patch.openingBalance !== undefined ? Number(patch.openingBalance) : cur.opening_balance, id);
  return { ...mapAccount(db.prepare("SELECT * FROM accounts WHERE id=?").get(id)), currentBalance: calcExpectedBalance(businessId, id) };
}

function deleteAccount(businessId, id) {
  db.prepare("UPDATE accounts SET is_active=0 WHERE id=? AND business_id=?").run(id, businessId);
  return true;
}

// ── TRANSFERS ─────────────────────────────────────────────────────────────────
function listTransfers(businessId) {
  const rows = db.prepare(`
    SELECT t.*,
      fa.name as from_account_name, ta.name as to_account_name
    FROM account_transfers t
    LEFT JOIN accounts fa ON fa.id = t.from_account_id
    LEFT JOIN accounts ta ON ta.id = t.to_account_id
    WHERE t.business_id=? ORDER BY t.date DESC, t.created_at DESC
  `).all(businessId);
  return rows.map(mapTransfer);
}

function createTransfer(businessId, { fromAccountId, toAccountId, amount, date, notes }) {
  if (fromAccountId === toAccountId) throw new Error("Cannot transfer to same account");
  const id = newId();
  db.prepare(
    "INSERT INTO account_transfers (id,business_id,from_account_id,to_account_id,amount,date,notes,created_at) VALUES (?,?,?,?,?,?,?,?)"
  ).run(id, businessId, fromAccountId, toAccountId, Number(amount) || 0, date || todayStr(), notes || "", new Date().toISOString());
  return listTransfers(businessId).find(t => t.id === id);
}

function deleteTransfer(businessId, id) {
  db.prepare("DELETE FROM account_transfers WHERE id=? AND business_id=?").run(id, businessId);
  return true;
}

// ── DAY CLOSING ───────────────────────────────────────────────────────────────
function getOrCreateClosing(businessId, date) {
  let closing = db.prepare("SELECT * FROM day_closings WHERE business_id=? AND date=?").get(businessId, date);
  if (!closing) {
    const id = newId();
    db.prepare(
      "INSERT INTO day_closings (id,business_id,date,status,notes,difference,closed_at,created_at) VALUES (?,?,?,'open','',0,'',?)"
    ).run(id, businessId, date, new Date().toISOString());
    closing = db.prepare("SELECT * FROM day_closings WHERE id=?").get(id);
  }
  return closing;
}

function getClosingWithBalances(businessId, date) {
  const closing = getOrCreateClosing(businessId, date);
  const accounts = listAccounts(businessId);

  // Get saved actual balances if any
  const saved = db.prepare("SELECT * FROM day_closing_balances WHERE closing_id=?").all(closing.id);
  const savedMap = {};
  saved.forEach(s => { savedMap[s.account_id] = s; });

  const balances = accounts.map(acc => {
    const expected = calcExpectedBalance(businessId, acc.id);
    const savedEntry = savedMap[acc.id];
    return {
      accountId: acc.id, accountName: acc.name, accountType: acc.type,
      expected: expected,
      actual: savedEntry ? Number(savedEntry.actual) : null,
      difference: savedEntry ? Number(savedEntry.difference) : null,
    };
  });

  const totalExpected = balances.reduce((s, b) => s + b.expected, 0);
  const totalActual = balances.filter(b => b.actual !== null).reduce((s, b) => s + b.actual, 0);
  const totalDiff = balances.filter(b => b.difference !== null).reduce((s, b) => s + b.difference, 0);

  return {
    ...mapClosing(closing),
    balances,
    totalExpected,
    totalActual,
    totalDifference: totalDiff,
    allEntered: balances.every(b => b.actual !== null),
  };
}

function saveClosingBalances(businessId, date, entries) {
  // entries: [{ accountId, actual }]
  const closing = getOrCreateClosing(businessId, date);
  if (closing.status === "closed") throw new Error("This day is already closed.");

  const stmt = db.prepare(`
    INSERT INTO day_closing_balances (id,closing_id,account_id,account_name,expected,actual,difference)
    VALUES (?,?,?,?,?,?,?)
    ON CONFLICT(closing_id, account_id) DO UPDATE SET
      expected=excluded.expected, actual=excluded.actual, difference=excluded.difference
  `);
  // Need unique constraint — add it via migration
  try {
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_dcb_unique ON day_closing_balances(closing_id, account_id)");
  } catch (_) {}

  const accounts = listAccounts(businessId);
  const accMap = {};
  accounts.forEach(a => { accMap[a.id] = a; });

  db.prepare("DELETE FROM day_closing_balances WHERE closing_id=?").run(closing.id);
  let totalDiff = 0;
  entries.forEach(e => {
    const expected = calcExpectedBalance(businessId, e.accountId);
    const actual = Number(e.actual) || 0;
    const diff = actual - expected;
    totalDiff += diff;
    stmt.run(newId(), closing.id, e.accountId, accMap[e.accountId]?.name || "", expected, actual, diff);
  });

  db.prepare("UPDATE day_closings SET difference=? WHERE id=?").run(totalDiff, closing.id);
  return getClosingWithBalances(businessId, date);
}

function closeDay(businessId, date, notes) {
  const closing = getOrCreateClosing(businessId, date);
  if (closing.status === "closed") throw new Error("Already closed.");
  db.prepare("UPDATE day_closings SET status='closed', notes=?, closed_at=? WHERE id=?")
    .run(notes || "", new Date().toISOString(), closing.id);
  return getClosingWithBalances(businessId, date);
}

function listClosings(businessId) {
  return db.prepare("SELECT * FROM day_closings WHERE business_id=? ORDER BY date DESC LIMIT 60")
    .all(businessId).map(mapClosing);
}

// ── P&L by category ──────────────────────────────────────────────────────────
function getPnlByCategory(businessId, from, to) {
  const expenses = db.prepare(`
    SELECT category, COALESCE(SUM(amount),0) total
    FROM expenses WHERE business_id=? AND date>=? AND date<=?
    GROUP BY category ORDER BY category
  `).all(businessId, from, to);

  const income = db.prepare(`
    SELECT COALESCE(SUM(amount),0) t FROM payments WHERE business_id=? AND date>=? AND date<=?
  `).get(businessId, from, to);
  const manualIncome = db.prepare(`
    SELECT COALESCE(SUM(amount),0) t FROM income WHERE business_id=? AND date>=? AND date<=?
  `).get(businessId, from, to);

  const totalIncome = Number(income.t) + Number(manualIncome.t);
  const totalExpenses = expenses.reduce((s, r) => s + Number(r.total), 0);

  return {
    from, to,
    income: totalIncome,
    expensesByCategory: expenses.map(e => ({ category: e.category, amount: Number(e.total) })),
    totalExpenses,
    netIncome: totalIncome - totalExpenses,
  };
}

// ── Receivables aging ────────────────────────────────────────────────────────
function getReceivablesAging(businessId) {
  const today = new Date();
  const sales = db.prepare(`
    SELECT s.*, COALESCE(SUM(p.amount),0) paid_sum
    FROM sales s LEFT JOIN payments p ON p.sale_id=s.id
    WHERE s.business_id=? GROUP BY s.id HAVING (s.total - paid_sum) > 0
  `).all(businessId);

  const buckets = { "0-7 days": [], "8-30 days": [], "31-90 days": [], "90+ days": [] };
  sales.forEach(s => {
    const due = Number(s.total) - Number(s.paid_sum);
    const days = Math.floor((today - new Date(s.sale_date)) / 86400000);
    const entry = {
      invoiceNo: s.invoice_no, customerName: s.customer_name,
      mobile: s.mobile, saleDate: s.sale_date, due, daysOld: days,
    };
    if (days <= 7) buckets["0-7 days"].push(entry);
    else if (days <= 30) buckets["8-30 days"].push(entry);
    else if (days <= 90) buckets["31-90 days"].push(entry);
    else buckets["90+ days"].push(entry);
  });
  return buckets;
}

// ── Loans (lending / borrowing) ─────────────────────────────────────────────
const nowIso = () => new Date().toISOString();

function mapLoan(r) {
  if (!r) return null;
  const paid = Number(db.prepare(
    "SELECT COALESCE(SUM(amount),0) t FROM loan_payments WHERE loan_id=?"
  ).get(r.id).t) || 0;
  const amount = Number(r.amount) || 0;
  return {
    id: r.id, type: r.type, personName: r.person_name,
    customerId: r.customer_id || "", amount,
    date: r.date, accountId: r.account_id || "",
    notes: r.notes || "", status: r.status,
    paid, balance: Math.max(0, amount - paid),
  };
}

function listLoans(businessId, { type, status } = {}) {
  let sql = "SELECT * FROM loans WHERE business_id=?";
  const args = [businessId];
  if (type) { sql += " AND type=?"; args.push(type); }
  if (status) { sql += " AND status=?"; args.push(status); }
  sql += " ORDER BY date DESC, created_at DESC";
  return db.prepare(sql).all(...args).map(mapLoan);
}

function listLoansForCustomer(businessId, customerId) {
  return db.prepare(
    "SELECT * FROM loans WHERE business_id=? AND customer_id=? ORDER BY date DESC, created_at DESC"
  ).all(businessId, customerId).map(mapLoan);
}

function createLoan(businessId, { type, personName, customerId, amount, date, accountId, notes }) {
  if (type !== "lent" && type !== "borrowed") throw new Error("type must be 'lent' or 'borrowed'");
  if (!personName || !String(personName).trim()) throw new Error("Person name is required");
  if (!amount || Number(amount) <= 0) throw new Error("Amount must be greater than 0");
  const id = newId();
  db.prepare(
    `INSERT INTO loans (id,business_id,type,person_name,customer_id,amount,date,account_id,notes,status,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`
  ).run(id, businessId, type, String(personName).trim(), customerId || "", Number(amount),
        date || todayStr(), accountId || "", notes || "", "open", nowIso());
  return mapLoan(db.prepare("SELECT * FROM loans WHERE id=?").get(id));
}

function updateLoan(businessId, id, patch) {
  const cur = db.prepare("SELECT * FROM loans WHERE id=? AND business_id=?").get(id, businessId);
  if (!cur) return null;
  db.prepare(
    `UPDATE loans SET person_name=?, amount=?, date=?, account_id=?, notes=? WHERE id=?`
  ).run(
    patch.personName !== undefined ? String(patch.personName).trim() : cur.person_name,
    patch.amount !== undefined ? Number(patch.amount) : cur.amount,
    patch.date !== undefined ? patch.date : cur.date,
    patch.accountId !== undefined ? patch.accountId : cur.account_id,
    patch.notes !== undefined ? patch.notes : cur.notes,
    id
  );
  return mapLoan(db.prepare("SELECT * FROM loans WHERE id=?").get(id));
}

function deleteLoan(businessId, id) {
  db.prepare("DELETE FROM loans WHERE id=? AND business_id=?").run(id, businessId);
  return { ok: true };
}

function addLoanPayment(businessId, loanId, { amount, date, accountId, notes }) {
  const loan = db.prepare("SELECT * FROM loans WHERE id=? AND business_id=?").get(loanId, businessId);
  if (!loan) throw new Error("Loan not found");
  if (!amount || Number(amount) <= 0) throw new Error("Amount must be greater than 0");
  const id = newId();
  db.prepare(
    `INSERT INTO loan_payments (id,business_id,loan_id,amount,date,account_id,notes) VALUES (?,?,?,?,?,?,?)`
  ).run(id, businessId, loanId, Number(amount), date || todayStr(), accountId || "", notes || "");

  // Auto-mark settled if fully paid
  const mapped = mapLoan(db.prepare("SELECT * FROM loans WHERE id=?").get(loanId));
  if (mapped.balance <= 0) {
    db.prepare("UPDATE loans SET status='settled' WHERE id=?").run(loanId);
  }
  return mapLoan(db.prepare("SELECT * FROM loans WHERE id=?").get(loanId));
}

function listLoanPayments(businessId, loanId) {
  return db.prepare(
    "SELECT * FROM loan_payments WHERE business_id=? AND loan_id=? ORDER BY date DESC"
  ).all(businessId, loanId).map(r => ({
    id: r.id, amount: Number(r.amount), date: r.date, accountId: r.account_id || "", notes: r.notes || "",
  }));
}

function markLoanSettled(businessId, id) {
  db.prepare("UPDATE loans SET status='settled' WHERE id=? AND business_id=?").run(id, businessId);
  return mapLoan(db.prepare("SELECT * FROM loans WHERE id=?").get(id));
}
function reopenLoan(businessId, id) {
  db.prepare("UPDATE loans SET status='open' WHERE id=? AND business_id=?").run(id, businessId);
  return mapLoan(db.prepare("SELECT * FROM loans WHERE id=?").get(id));
}

// Summary: total receivable (money owed to me) and total payable (money I owe)
function getLoanSummary(businessId) {
  const lent = db.prepare("SELECT * FROM loans WHERE business_id=? AND type='lent'").all(businessId).map(mapLoan);
  const borrowed = db.prepare("SELECT * FROM loans WHERE business_id=? AND type='borrowed'").all(businessId).map(mapLoan);
  const totalReceivable = lent.reduce((s, l) => s + l.balance, 0);
  const totalPayable = borrowed.reduce((s, l) => s + l.balance, 0);
  return { totalReceivable, totalPayable, lentCount: lent.filter(l=>l.status==='open').length, borrowedCount: borrowed.filter(l=>l.status==='open').length };
}

module.exports = {
  EXPENSE_CATEGORIES, ACCOUNT_TYPES,
  listAccounts, createAccount, updateAccount, deleteAccount,
  listTransfers, createTransfer, deleteTransfer,
  getClosingWithBalances, saveClosingBalances, closeDay, listClosings,
  getPnlByCategory, getReceivablesAging, calcExpectedBalance,
  listLoans, listLoansForCustomer, createLoan, updateLoan, deleteLoan,
  addLoanPayment, listLoanPayments, markLoanSettled, reopenLoan, getLoanSummary,
};

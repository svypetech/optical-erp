const express = require("express");
const excel = require("../services/excelService");
const { authRequired } = require("../services/auth");

const router = express.Router({ mergeParams: true });
router.use(authRequired);

const todayStr = () => new Date().toISOString().slice(0, 10);
const sum = (arr) => arr.reduce((a, r) => a + (Number(r.amount) || 0), 0);

// Dashboard KPIs
router.get("/dashboard", async (req, res) => {
  const businessId = req.params.businessId;
  const income = await excel.listIncome(businessId);
  const expenses = await excel.listExpenses(businessId);
  const payments = await excel.listPayments(businessId);
  const today = todayStr();

  // Income = manual Income rows + payments actually received from sales.
  const incomeOnDay = (d) =>
    sum(income.filter((r) => r.date === d)) +
    sum(payments.filter((p) => p.date === d));

  const todayIncome = incomeOnDay(today);
  const todayExpenses = sum(expenses.filter((r) => r.date === today));
  const totalIncome = sum(income) + sum(payments);
  const totalExpenses = sum(expenses);

  res.json({
    todayIncome,
    todayExpenses,
    todayNetIncome: todayIncome - todayExpenses,
    totalRevenue: totalIncome,
    totalExpenses,
    totalNetIncome: totalIncome - totalExpenses,
    incomeCount: income.length + payments.length,
    expenseCount: expenses.length,
  });
});

// ISO week key, e.g. 2026-W24
function weekKey(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (tmp.getUTCDay() + 6) % 7;
  tmp.setUTCDate(tmp.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((tmp - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7
    );
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// Summaries grouped daily / weekly / monthly
router.get("/summary", async (req, res) => {
  const businessId = req.params.businessId;
  const income = await excel.listIncome(businessId);
  const expenses = await excel.listExpenses(businessId);
  const payments = await excel.listPayments(businessId);

  const group = (keyFn) => {
    const map = {};
    income.forEach((r) => {
      const k = keyFn(r.date);
      map[k] = map[k] || { key: k, income: 0, expenses: 0 };
      map[k].income += Number(r.amount) || 0;
    });
    payments.forEach((p) => {
      const k = keyFn(p.date);
      map[k] = map[k] || { key: k, income: 0, expenses: 0 };
      map[k].income += Number(p.amount) || 0;
    });
    expenses.forEach((r) => {
      const k = keyFn(r.date);
      map[k] = map[k] || { key: k, income: 0, expenses: 0 };
      map[k].expenses += Number(r.amount) || 0;
    });
    return Object.values(map)
      .map((g) => ({ ...g, netIncome: g.income - g.expenses }))
      .sort((a, b) => (a.key < b.key ? 1 : -1));
  };

  res.json({
    daily: group((d) => d),
    weekly: group((d) => weekKey(d)),
    monthly: group((d) => String(d).slice(0, 7)),
  });
});

module.exports = router;

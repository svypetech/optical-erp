const express = require("express");
const fs = require("fs");
const excel = require("../services/excelService");
const { authRequired } = require("../services/auth");

const router = express.Router({ mergeParams: true });
router.use(authRequired);

function csvEscape(v) {
  const s = String(v ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

// Export the live business workbook as .xlsx
router.get("/xlsx", async (req, res) => {
  const businessId = req.params.businessId;
  const biz = await excel.getBusiness(businessId);
  if (!biz) return res.status(404).json({ error: "Business not found" });

  const filePath = await excel.getBusinessFilePath(businessId);
  if (!fs.existsSync(filePath))
    return res.status(404).json({ error: "No data file yet" });

  const safe = String(biz.name).replace(/[^a-z0-9]+/gi, "_");
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${safe}.xlsx"`);
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
  // delete the temp file once sent
  stream.on("close", () => fs.unlink(filePath, () => {}));
});

// Export sales, payments, income & expenses as a single CSV
router.get("/csv", async (req, res) => {
  const businessId = req.params.businessId;
  const biz = await excel.getBusiness(businessId);
  if (!biz) return res.status(404).json({ error: "Business not found" });

  // Optional date range filter: ?from=YYYY-MM-DD&to=YYYY-MM-DD
  const { from, to } = req.query;
  const inRange = (dateStr) => {
    const d = String(dateStr);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  };

  const income = (await excel.listIncome(businessId)).filter((r) => inRange(r.date));
  const expenses = (await excel.listExpenses(businessId)).filter((r) => inRange(r.date));
  const payments = (await excel.listPayments(businessId)).filter((p) => inRange(p.date));
  // sales filtered by sale date (for the detail section)
  const sales = (await excel.listSales(businessId)).filter((s) => inRange(s.saleDate));

  const lines = [];
  if (from || to) {
    lines.push(["Report Range", `${from || "start"} to ${to || "end"}`].map(csvEscape).join(","));
    lines.push("");
  }

  // --- Section 1: Sales detail ---
  lines.push(["Sales"].map(csvEscape).join(","));
  lines.push(
    ["Invoice", "Date", "Customer", "Mobile", "Frame", "Lens", "Discount %", "Total", "Paid", "Due", "Status"].join(",")
  );
  sales.forEach((s) =>
    lines.push(
      [s.invoiceNo, s.saleDate, s.customerName, s.mobile, s.framePrice, s.lensPrice,
       s.discountPct, s.total, s.paid, s.due, s.due <= 0 ? "Cleared" : "Pending"]
        .map(csvEscape).join(",")
    )
  );

  // --- Section 2: Money received (payments + manual income) ---
  lines.push("");
  lines.push(["Money Received"].map(csvEscape).join(","));
  lines.push(["Date", "Source", "Description", "Method", "Amount"].join(","));
  payments.forEach((p) =>
    lines.push(
      [p.date, "Sale", `${p.invoiceNo || ""} ${p.customerName || ""} (${p.kind || ""})`.trim(), p.method, p.amount]
        .map(csvEscape).join(",")
    )
  );
  income.forEach((r) =>
    lines.push(
      [r.date, "Manual", r.customerName, "", r.amount].map(csvEscape).join(",")
    )
  );

  // --- Section 3: Expenses ---
  lines.push("");
  lines.push(["Expenses"].map(csvEscape).join(","));
  lines.push(["Date", "Expense", "Amount", "Notes"].join(","));
  expenses.forEach((r) =>
    lines.push([r.date, r.expenseName, r.amount, r.notes].map(csvEscape).join(","))
  );

  // --- Section 4: Daily summary (income received vs expenses) ---
  const byDay = {};
  const addIncome = (d, amt) => {
    byDay[d] = byDay[d] || { income: 0, expenses: 0 };
    byDay[d].income += Number(amt) || 0;
  };
  const addExpense = (d, amt) => {
    byDay[d] = byDay[d] || { income: 0, expenses: 0 };
    byDay[d].expenses += Number(amt) || 0;
  };
  payments.forEach((p) => addIncome(String(p.date), p.amount));
  income.forEach((r) => addIncome(String(r.date), r.amount));
  expenses.forEach((r) => addExpense(String(r.date), r.amount));

  lines.push("");
  lines.push(["Daily Summary"].map(csvEscape).join(","));
  lines.push(["Date", "Income Received", "Expenses", "Net Income"].join(","));
  let totalIncome = 0;
  let totalExpenses = 0;
  Object.keys(byDay).sort().forEach((d) => {
    const inc = byDay[d].income;
    const exp = byDay[d].expenses;
    totalIncome += inc;
    totalExpenses += exp;
    lines.push([d, inc, exp, inc - exp].map(csvEscape).join(","));
  });

  // --- Section 5: Totals ---
  lines.push("");
  lines.push(["Totals"].map(csvEscape).join(","));
  lines.push(["Total Income Received", totalIncome].map(csvEscape).join(","));
  lines.push(["Total Expenses", totalExpenses].map(csvEscape).join(","));
  lines.push(["Net Income", totalIncome - totalExpenses].map(csvEscape).join(","));

  const safe = String(biz.name).replace(/[^a-z0-9]+/gi, "_");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${safe}.csv"`);
  res.send(lines.join("\n"));
});

module.exports = router;

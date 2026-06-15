const express = require("express");
const excel = require("../services/excelService");
const { authRequired } = require("../services/auth");

const router = express.Router({ mergeParams: true });
router.use(authRequired);

router.get("/", async (req, res) => {
  res.json(await excel.listIncome(req.params.businessId));
});

// Combined money-in view: manual income entries + all sale payments.
// Read-only; used by the Income tab so it matches the dashboard.
router.get("/all", async (req, res) => {
  const businessId = req.params.businessId;
  const manual = await excel.listIncome(businessId);
  const payments = await excel.listPayments(businessId);

  const rows = [
    ...manual.map((r) => ({
      id: r.id,
      date: r.date,
      source: "Manual",
      description: r.customerName || "Income",
      method: "",
      amount: Number(r.amount) || 0,
      editable: true,
    })),
    ...payments.map((p) => ({
      id: p.id,
      date: p.date,
      source: "Sale",
      description: `${p.invoiceNo || ""} — ${p.customerName || ""} (${p.kind || "Payment"})`.trim(),
      method: p.method || "",
      amount: Number(p.amount) || 0,
      editable: false,
    })),
  ].sort((a, b) => (a.date < b.date ? 1 : -1));

  res.json(rows);
});

router.post("/", async (req, res) => {
  const row = await excel.addIncome(req.params.businessId, req.body);
  res.json(row);
});

router.put("/:id", async (req, res) => {
  const row = await excel.updateIncome(req.params.businessId, req.params.id, req.body);
  if (!row) return res.status(404).json({ error: "Income entry not found" });
  res.json(row);
});

router.delete("/:id", async (req, res) => {
  await excel.deleteIncome(req.params.businessId, req.params.id);
  res.json({ ok: true });
});

module.exports = router;

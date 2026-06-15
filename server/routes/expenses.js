const express = require("express");
const excel = require("../services/excelService");
const { authRequired } = require("../services/auth");

const router = express.Router({ mergeParams: true });
router.use(authRequired);

router.get("/", async (req, res) => {
  res.json(await excel.listExpenses(req.params.businessId));
});

router.post("/", async (req, res) => {
  const row = await excel.addExpense(req.params.businessId, req.body);
  res.json(row);
});

router.put("/:id", async (req, res) => {
  const row = await excel.updateExpense(req.params.businessId, req.params.id, req.body);
  if (!row) return res.status(404).json({ error: "Expense entry not found" });
  res.json(row);
});

router.delete("/:id", async (req, res) => {
  await excel.deleteExpense(req.params.businessId, req.params.id);
  res.json({ ok: true });
});

module.exports = router;

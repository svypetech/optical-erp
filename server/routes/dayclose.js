const express = require("express");
const svc = require("../services/excelService");
const { authRequired } = require("../services/auth");
const router = express.Router({ mergeParams: true });
router.use(authRequired);

// Get today's closing (or null)
router.get("/today", async (req, res) => {
  const closing = await svc.getTodayClosing(req.params.businessId);
  if (!closing) return res.json(null);
  const db = require("../services/db");
  const balances = db.prepare("SELECT * FROM day_closing_balances WHERE closing_id=?")
    .all(closing.id).map(r => ({
      id: r.id, accountId: r.account_id, accountName: r.account_name,
      expected: Number(r.expected), actual: Number(r.actual), difference: Number(r.difference),
    }));
  res.json({ closing, balances });
});

// Start day closing wizard
router.post("/start", async (req, res) => {
  res.json(await svc.startDayClosing(req.params.businessId));
});

// Update actual balances entered by user
router.put("/:closingId/actuals", async (req, res) => {
  const { balances } = req.body; // [{ accountId, actual }]
  res.json(await svc.updateClosingActual(req.params.businessId, req.params.closingId, balances));
});

// Confirm / close the day
router.post("/:closingId/confirm", async (req, res) => {
  const { notes } = req.body;
  res.json(await svc.confirmDayClosing(req.params.businessId, req.params.closingId, notes));
});

// History
router.get("/history", async (req, res) => {
  res.json(await svc.listDayClosings(req.params.businessId));
});

module.exports = router;

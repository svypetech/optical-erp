const express = require("express");
const svc = require("../services/excelService");
const { authRequired } = require("../services/auth");
const router = express.Router({ mergeParams: true });
router.use(authRequired);

router.get("/", async (req, res) => {
  res.json(await svc.listTransfers(req.params.businessId));
});
router.post("/", async (req, res) => {
  const { date, fromAccountId, toAccountId, amount, notes } = req.body;
  if (!fromAccountId || !toAccountId || !amount)
    return res.status(400).json({ error: "from, to and amount required" });
  res.json(await svc.createTransfer(req.params.businessId, { date, fromAccountId, toAccountId, amount, notes }));
});
router.delete("/:id", async (req, res) => {
  await svc.deleteTransfer(req.params.businessId, req.params.id);
  res.json({ ok: true });
});
module.exports = router;

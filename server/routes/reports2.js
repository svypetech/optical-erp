const express = require("express");
const svc = require("../services/excelService");
const { authRequired } = require("../services/auth");
const router = express.Router({ mergeParams: true });
router.use(authRequired);

router.get("/pnl", async (req, res) => {
  const { from, to } = req.query;
  const today = new Date().toISOString().slice(0,10);
  res.json(await svc.getPnLReport(req.params.businessId, from || today.slice(0,7)+"-01", to || today));
});
router.get("/aging", async (req, res) => {
  res.json(await svc.getReceivablesAging(req.params.businessId));
});
module.exports = router;

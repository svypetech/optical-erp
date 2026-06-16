const express = require("express");
const svc = require("../services/excelService");
const { authRequired } = require("../services/auth");
const router = express.Router({ mergeParams: true });
router.use(authRequired);

router.get("/", async (req, res) => {
  res.json(await svc.listDayClosings(req.params.businessId));
});
router.get("/:date", async (req, res) => {
  res.json(await svc.getDayClosingWithEntries(req.params.businessId, req.params.date));
});
router.post("/:date", async (req, res) => {
  const { actualEntries, notes } = req.body;
  res.json(await svc.submitDayClosing(req.params.businessId, req.params.date, { actualEntries, notes }));
});
module.exports = router;

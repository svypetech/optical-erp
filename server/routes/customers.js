const express = require("express");
const excel = require("../services/excelService");
const { authRequired } = require("../services/auth");

const router = express.Router({ mergeParams: true });
router.use(authRequired);

// list customers (with totals)
router.get("/", async (req, res) => {
  res.json(await excel.listCustomers(req.params.businessId));
});

// check if a name+mobile already matches a customer (for the New Sale prompt)
router.get("/match", async (req, res) => {
  const { name, mobile } = req.query;
  const found = await excel.findCustomerByNameMobile(req.params.businessId, name, mobile);
  res.json({ match: found || null });
});

// a single customer's full ledger
router.get("/:id/ledger", async (req, res) => {
  const ledger = await excel.getCustomerLedger(req.params.businessId, req.params.id);
  if (!ledger) return res.status(404).json({ error: "Customer not found" });
  res.json(ledger);
});

router.post("/", async (req, res) => {
  const c = await excel.createCustomer(req.params.businessId, req.body);
  res.json(c);
});

router.put("/:id", async (req, res) => {
  const c = await excel.updateCustomer(req.params.businessId, req.params.id, req.body);
  if (!c) return res.status(404).json({ error: "Customer not found" });
  res.json(c);
});

module.exports = router;

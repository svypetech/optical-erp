const express = require("express");
const excel = require("../services/excelService");
const { authRequired } = require("../services/auth");

const router = express.Router({ mergeParams: true });
router.use(authRequired);

// list all sales (with paid/due computed)
router.get("/", async (req, res) => {
  res.json(await excel.listSales(req.params.businessId));
});

// single sale with its payments (used by the invoice)
router.get("/:id", async (req, res) => {
  const sale = await excel.getSale(req.params.businessId, req.params.id);
  if (!sale) return res.status(404).json({ error: "Sale not found" });
  res.json(sale);
});

// create a sale (+ optional advance payment)
router.post("/", async (req, res) => {
  const sale = await excel.createSale(req.params.businessId, req.body);
  res.json(sale);
});

// record a balance / additional payment
router.post("/:id/payment", async (req, res) => {
  const sale = await excel.addSalePayment(req.params.businessId, req.params.id, req.body);
  if (!sale) return res.status(404).json({ error: "Sale not found" });
  res.json(sale);
});

router.delete("/:id", async (req, res) => {
  await excel.deleteSale(req.params.businessId, req.params.id);
  res.json({ ok: true });
});

module.exports = router;

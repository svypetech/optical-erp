const express = require("express");
const excel = require("../services/excelService");
const { authRequired } = require("../services/auth");

const router = express.Router();
router.use(authRequired);

router.get("/", async (req, res) => {
  res.json(await excel.listBusinesses());
});

router.post("/", async (req, res) => {
  const { name, currency, notes, address, phone, logoUrl } = req.body;
  if (!name) return res.status(400).json({ error: "Business name is required" });
  const biz = await excel.createBusiness({ name, currency, notes, address, phone, logoUrl });
  res.json(biz);
});

router.put("/:id", async (req, res) => {
  const { name, currency, notes, address, phone, logoUrl } = req.body;
  const updated = await excel.updateBusiness(req.params.id, {
    name, currency, notes, address, phone, logoUrl,
  });
  if (!updated) return res.status(404).json({ error: "Business not found" });
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  await excel.deleteBusiness(req.params.id);
  res.json({ ok: true });
});

module.exports = router;

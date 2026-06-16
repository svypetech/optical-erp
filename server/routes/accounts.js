const express = require("express");
const svc = require("../services/accountingService");
const { authRequired } = require("../services/auth");
const router = express.Router({ mergeParams: true });
router.use(authRequired);

const biz = (req) => req.params.businessId;

// Accounts
router.get("/accounts", (req, res) => res.json(svc.listAccounts(biz(req))));
router.post("/accounts", (req, res) => { try { res.json(svc.createAccount(biz(req), req.body)); } catch(e){ res.status(400).json({error:e.message}); }});
router.put("/accounts/:id", (req, res) => { const r=svc.updateAccount(biz(req),req.params.id,req.body); r?res.json(r):res.status(404).json({error:"Not found"}); });
router.delete("/accounts/:id", (req, res) => { svc.deleteAccount(biz(req),req.params.id); res.json({ok:true}); });

// Transfers
router.get("/transfers", (req, res) => res.json(svc.listTransfers(biz(req))));
router.post("/transfers", (req, res) => { try { res.json(svc.createTransfer(biz(req), req.body)); } catch(e){ res.status(400).json({error:e.message}); }});
router.delete("/transfers/:id", (req, res) => { svc.deleteTransfer(biz(req),req.params.id); res.json({ok:true}); });

// Day closing
router.get("/closing/:date", (req, res) => res.json(svc.getClosingWithBalances(biz(req), req.params.date)));
router.post("/closing/:date/balances", (req, res) => { try { res.json(svc.saveClosingBalances(biz(req),req.params.date,req.body.entries)); } catch(e){ res.status(400).json({error:e.message}); }});
router.post("/closing/:date/close", (req, res) => { try { res.json(svc.closeDay(biz(req),req.params.date,req.body.notes)); } catch(e){ res.status(400).json({error:e.message}); }});
router.get("/closings", (req, res) => res.json(svc.listClosings(biz(req))));

// P&L and Aging
router.get("/pnl", (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: "from and to required" });
  res.json(svc.getPnlByCategory(biz(req), from, to));
});
router.get("/aging", (req, res) => res.json(svc.getReceivablesAging(biz(req))));

module.exports = router;

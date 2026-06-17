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

// Loans (lending / borrowing)
router.get("/loans", (req, res) => res.json(svc.listLoans(biz(req), { type: req.query.type, status: req.query.status })));
router.get("/loans/summary", (req, res) => res.json(svc.getLoanSummary(biz(req))));
router.get("/loans/by-customer/:customerId", (req, res) => res.json(svc.listLoansForCustomer(biz(req), req.params.customerId)));
router.post("/loans", (req, res) => { try { res.json(svc.createLoan(biz(req), req.body)); } catch(e){ res.status(400).json({error:e.message}); }});
router.put("/loans/:id", (req, res) => { const r = svc.updateLoan(biz(req), req.params.id, req.body); r ? res.json(r) : res.status(404).json({error:"Not found"}); });
router.delete("/loans/:id", (req, res) => { svc.deleteLoan(biz(req), req.params.id); res.json({ok:true}); });
router.post("/loans/:id/settle", (req, res) => res.json(svc.markLoanSettled(biz(req), req.params.id)));
router.post("/loans/:id/reopen", (req, res) => res.json(svc.reopenLoan(biz(req), req.params.id)));
router.get("/loans/:id/payments", (req, res) => res.json(svc.listLoanPayments(biz(req), req.params.id)));
router.post("/loans/:id/payments", (req, res) => { try { res.json(svc.addLoanPayment(biz(req), req.params.id, req.body)); } catch(e){ res.status(400).json({error:e.message}); }});

module.exports = router;

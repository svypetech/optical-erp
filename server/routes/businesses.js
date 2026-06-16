const express = require("express");
const bcrypt = require("bcryptjs");
const excel = require("../services/excelService");
const { authRequired } = require("../services/auth");

const router = express.Router();
router.use(authRequired);

// ---- PIN attempt tracking (in-memory; resets on server restart — acceptable) ----
// { businessId -> { attempts: N, lockedUntil: timestamp|null } }
const pinState = {};
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000; // 15 minutes

function getPinState(id) {
  if (!pinState[id]) pinState[id] = { attempts: 0, lockedUntil: null };
  return pinState[id];
}

// List businesses — strip pin_hash before sending to client
router.get("/", async (req, res) => {
  const list = await excel.listBusinesses();
  res.json(list.map(({ pinHash, ...b }) => ({ ...b, hasPIN: !!pinHash })));
});

router.post("/", async (req, res) => {
  const { name, currency, notes, address, phone, logoUrl, pin } = req.body;
  if (!name) return res.status(400).json({ error: "Business name is required" });
  if (!pin || String(pin).length !== 4 || !/^\d{4}$/.test(String(pin)))
    return res.status(400).json({ error: "A 4-digit PIN is required" });
  const pinHash = await bcrypt.hash(String(pin), 10);
  const biz = await excel.createBusiness({ name, currency, notes, address, phone, logoUrl, pinHash });
  const { pinHash: _, ...safe } = biz;
  res.json({ ...safe, hasPIN: true });
});

router.put("/:id", async (req, res) => {
  const { name, currency, notes, address, phone, logoUrl, pin } = req.body;
  const patch = { name, currency, notes, address, phone, logoUrl };
  if (pin !== undefined && pin !== "") {
    if (!/^\d{4}$/.test(String(pin)))
      return res.status(400).json({ error: "PIN must be exactly 4 digits" });
    patch.pinHash = await bcrypt.hash(String(pin), 10);
  }
  const updated = await excel.updateBusiness(req.params.id, patch);
  if (!updated) return res.status(404).json({ error: "Business not found" });
  const { pinHash: _, ...safe } = updated;
  res.json({ ...safe, hasPIN: !!updated.pinHash });
});

router.delete("/:id", async (req, res) => {
  await excel.deleteBusiness(req.params.id);
  res.json({ ok: true });
});

// Verify PIN — also handles first-time PIN setup if none set yet
router.post("/:id/verify-pin", async (req, res) => {
  const { pin, newPin } = req.body;
  const biz = await excel.listBusinesses().then(list =>
    list.find(b => b.id === req.params.id));
  if (!biz) return res.status(404).json({ error: "Business not found" });

  const state = getPinState(req.params.id);

  // No PIN set yet — this is first-time setup
  if (!biz.pinHash) {
    if (!newPin || !/^\d{4}$/.test(String(newPin)))
      return res.status(400).json({ error: "Please set a 4-digit PIN.", requiresSetup: true });
    const pinHash = await bcrypt.hash(String(newPin), 10);
    await excel.updateBusiness(req.params.id, { pinHash });
    return res.json({ ok: true, pinSet: true });
  }

  // Check lockout
  if (state.lockedUntil && Date.now() < state.lockedUntil) {
    const remaining = Math.ceil((state.lockedUntil - Date.now()) / 60000);
    return res.status(429).json({
      error: `Too many wrong attempts. Try again in ${remaining} minute(s).`,
      locked: true,
    });
  }
  if (state.lockedUntil && Date.now() >= state.lockedUntil) {
    state.attempts = 0;
    state.lockedUntil = null;
  }

  const ok = await bcrypt.compare(String(pin || ""), biz.pinHash || "");
  if (!ok) {
    state.attempts += 1;
    if (state.attempts >= MAX_ATTEMPTS) {
      state.lockedUntil = Date.now() + LOCK_MS;
      return res.status(429).json({
        error: "Too many wrong attempts. Locked for 15 minutes.",
        locked: true,
      });
    }
    const left = MAX_ATTEMPTS - state.attempts;
    return res.status(401).json({
      error: `Wrong PIN. ${left} attempt(s) remaining.`,
    });
  }

  state.attempts = 0;
  state.lockedUntil = null;
  res.json({ ok: true });
});

// Change PIN — requires current PIN first
router.post("/:id/change-pin", async (req, res) => {
  const { currentPin, newPin } = req.body;
  const biz = await excel.listBusinesses().then(list =>
    list.find(b => b.id === req.params.id));
  if (!biz) return res.status(404).json({ error: "Business not found" });
  if (!/^\d{4}$/.test(String(newPin || "")))
    return res.status(400).json({ error: "New PIN must be exactly 4 digits." });

  // If no PIN set yet, allow setting without checking current
  if (biz.pinHash) {
    const ok = await bcrypt.compare(String(currentPin || ""), biz.pinHash);
    if (!ok) return res.status(401).json({ error: "Current PIN is wrong." });
  }

  const pinHash = await bcrypt.hash(String(newPin), 10);
  await excel.updateBusiness(req.params.id, { pinHash });
  res.json({ ok: true });
});

module.exports = router;

const express = require("express");
const bcrypt = require("bcryptjs");
const excel = require("../services/excelService");
const { signToken } = require("../services/auth");

const router = express.Router();

// Whether an account already exists (controls register vs login on the client).
router.get("/status", async (req, res) => {
  const user = await excel.getUser();
  res.json({ registered: !!user });
});

// Register the single user.
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required" });

    const existing = await excel.getUser();
    if (existing)
      return res.status(400).json({ error: "An account already exists. Please log in." });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await excel.createUser(email, passwordHash);
    const token = signToken(user);
    res.json({ token, email: user.email });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Log in.
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await excel.getUser();
    if (!user) return res.status(400).json({ error: "No account found. Please register." });

    const emailOk = String(user.email).toLowerCase() === String(email).toLowerCase();
    const passOk = emailOk && (await bcrypt.compare(password, user.passwordHash));
    if (!emailOk || !passOk)
      return res.status(401).json({ error: "Invalid email or password" });

    const token = signToken(user);
    res.json({ token, email: user.email });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;

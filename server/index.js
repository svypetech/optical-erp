const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/businesses", require("./routes/businesses"));
app.use("/api/businesses/:businessId/income", require("./routes/income"));
app.use("/api/businesses/:businessId/expenses", require("./routes/expenses"));
app.use("/api/businesses/:businessId/sales", require("./routes/sales"));
app.use("/api/businesses/:businessId/customers", require("./routes/customers"));
app.use("/api/businesses/:businessId/reports", require("./routes/reports"));
app.use("/api/businesses/:businessId/export", require("./routes/export"));
// Accounting: accounts, transfers, closing, P&L, aging
const accountingRouter = require("./routes/accounts");
app.use("/api/businesses/:businessId", accountingRouter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Serve React client in production
const clientBuild = path.join(__dirname, "..", "client", "dist");

// Hashed JS/CSS/image files (e.g. index-aB3xQ.js) are safe to cache forever —
// their filename changes every build, so a new deploy is automatically picked up.
app.use(express.static(clientBuild, {
  index: false, // never auto-serve index.html from here; handled below with no-cache
  setHeaders: (res, filePath) => {
    if (/\.(js|css|woff2?|png|jpg|jpeg|svg|ico)$/.test(filePath)) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }
  },
}));

app.get(/^(?!\/api).*/, (req, res) => {
  // index.html must NEVER be cached — it references the current build's hashed
  // file names. If browsers cache this, they keep loading old JS forever and
  // the app can appear blank, broken, or stuck on stale data after a deploy.
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.sendFile(path.join(clientBuild, "index.html"), (err) => {
    if (err) res.status(404).send("Client not built.");
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Business Ledger on http://localhost:${PORT}`));

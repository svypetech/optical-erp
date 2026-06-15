const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth");
const businessRoutes = require("./routes/businesses");
const incomeRoutes = require("./routes/income");
const expenseRoutes = require("./routes/expenses");
const salesRoutes = require("./routes/sales");
const customerRoutes = require("./routes/customers");
const reportRoutes = require("./routes/reports");
const exportRoutes = require("./routes/export");

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" })); // allow base64 logo uploads

// API
app.use("/api/auth", authRoutes);
app.use("/api/businesses", businessRoutes);
app.use("/api/businesses/:businessId/income", incomeRoutes);
app.use("/api/businesses/:businessId/expenses", expenseRoutes);
app.use("/api/businesses/:businessId/sales", salesRoutes);
app.use("/api/businesses/:businessId/customers", customerRoutes);
app.use("/api/businesses/:businessId/reports", reportRoutes);
app.use("/api/businesses/:businessId/export", exportRoutes);

app.get("/api/health", (req, res) => res.json({ ok: true }));

// Serve the built React client in production (optional)
const clientBuild = path.join(__dirname, "..", "client", "dist");
app.use(express.static(clientBuild));
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(clientBuild, "index.html"), (err) => {
    if (err) res.status(404).send("Client not built. Run the dev server instead.");
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Business Ledger API on http://localhost:${PORT}`));

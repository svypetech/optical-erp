const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

// DATA_DIR can be overridden by env (for cloud persistent volumes).
// On Render, set DATA_DIR=/var/data and mount a disk there.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_FILE = path.join(DATA_DIR, "ledger.db");
const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL"); // safe concurrent reads/writes
db.pragma("foreign_keys = ON");

// ---- Schema ----------------------------------------------------------------
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS businesses (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  currency   TEXT NOT NULL DEFAULT 'USD',
  address    TEXT DEFAULT '',
  phone      TEXT DEFAULT '',
  logo_url   TEXT DEFAULT '',
  notes      TEXT DEFAULT '',
  pin_hash   TEXT DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
  id         TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name       TEXT NOT NULL DEFAULT '',
  mobile     TEXT DEFAULT '',
  r_sph TEXT DEFAULT '', r_cyl TEXT DEFAULT '', r_axis TEXT DEFAULT '', r_add TEXT DEFAULT '',
  l_sph TEXT DEFAULT '', l_cyl TEXT DEFAULT '', l_axis TEXT DEFAULT '', l_add TEXT DEFAULT '',
  notes      TEXT DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_customers_biz ON customers(business_id);

CREATE TABLE IF NOT EXISTS income (
  id          TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_name TEXT DEFAULT '',
  date        TEXT NOT NULL,
  amount      REAL NOT NULL DEFAULT 0,
  notes       TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_income_biz ON income(business_id);

CREATE TABLE IF NOT EXISTS expenses (
  id          TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  expense_name TEXT DEFAULT '',
  date        TEXT NOT NULL,
  amount      REAL NOT NULL DEFAULT 0,
  notes       TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_expenses_biz ON expenses(business_id);

CREATE TABLE IF NOT EXISTS sales (
  id           TEXT PRIMARY KEY,
  business_id  TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_no   TEXT,
  customer_id  TEXT,
  sale_date    TEXT NOT NULL,
  customer_name TEXT DEFAULT '',
  mobile       TEXT DEFAULT '',
  r_sph TEXT DEFAULT '', r_cyl TEXT DEFAULT '', r_axis TEXT DEFAULT '', r_add TEXT DEFAULT '',
  l_sph TEXT DEFAULT '', l_cyl TEXT DEFAULT '', l_axis TEXT DEFAULT '', l_add TEXT DEFAULT '',
  lens_quality TEXT DEFAULT '',
  frame_price  REAL DEFAULT 0,
  lens_price   REAL DEFAULT 0,
  subtotal     REAL DEFAULT 0,
  discount_pct REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  total        REAL DEFAULT 0,
  delivery_date TEXT DEFAULT '',
  status       TEXT DEFAULT 'Pending',
  notes        TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_sales_biz ON sales(business_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);

CREATE TABLE IF NOT EXISTS payments (
  id          TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  sale_id     TEXT NOT NULL,
  invoice_no  TEXT,
  customer_name TEXT DEFAULT '',
  date        TEXT NOT NULL,
  amount      REAL NOT NULL DEFAULT 0,
  method      TEXT DEFAULT 'POS',
  kind        TEXT DEFAULT 'Balance'
);
CREATE INDEX IF NOT EXISTS idx_payments_biz ON payments(business_id);
CREATE INDEX IF NOT EXISTS idx_payments_sale ON payments(sale_id);
`);

// Migrations — safe to run on every start (ADD COLUMN IF NOT EXISTS not available
// in older SQLite, so we catch the "duplicate column" error silently).
try { db.exec("ALTER TABLE businesses ADD COLUMN pin_hash TEXT DEFAULT ''"); } catch (_) {}
try { db.exec("ALTER TABLE customers ADD COLUMN r_sph TEXT DEFAULT ''"); } catch (_) {}
try { db.exec("ALTER TABLE customers ADD COLUMN r_cyl TEXT DEFAULT ''"); } catch (_) {}
try { db.exec("ALTER TABLE customers ADD COLUMN r_axis TEXT DEFAULT ''"); } catch (_) {}
try { db.exec("ALTER TABLE customers ADD COLUMN r_add TEXT DEFAULT ''"); } catch (_) {}
try { db.exec("ALTER TABLE customers ADD COLUMN l_sph TEXT DEFAULT ''"); } catch (_) {}
try { db.exec("ALTER TABLE customers ADD COLUMN l_cyl TEXT DEFAULT ''"); } catch (_) {}
try { db.exec("ALTER TABLE customers ADD COLUMN l_axis TEXT DEFAULT ''"); } catch (_) {}
try { db.exec("ALTER TABLE customers ADD COLUMN l_add TEXT DEFAULT ''"); } catch (_) {}

module.exports = db;

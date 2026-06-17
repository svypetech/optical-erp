const path = require("path");
const fs = require("fs");

// better-sqlite3 needs a compiled native binary.
// On fresh Render deploys the binary may be missing.
// We save it to the persistent disk on first run and restore it on subsequent deploys.
const BINARY_NAME = "better_sqlite3.node";
const BINARY_BACKUP = "/var/data/sqlite-binary/" + BINARY_NAME;
const BINARY_DEST = path.join(__dirname, "..", "node_modules", "better-sqlite3", "build", "Release", BINARY_NAME);

if (!fs.existsSync(BINARY_DEST) && fs.existsSync(BINARY_BACKUP)) {
  try {
    fs.mkdirSync(path.dirname(BINARY_DEST), { recursive: true });
    fs.copyFileSync(BINARY_BACKUP, BINARY_DEST);
    console.log("Restored better-sqlite3 binary from persistent disk.");
  } catch (e) {
    console.error("Could not restore binary:", e.message);
  }
} else if (fs.existsSync(BINARY_DEST) && !fs.existsSync(BINARY_BACKUP)) {
  // Save backup for future deploys
  try {
    fs.mkdirSync(path.dirname(BINARY_BACKUP), { recursive: true });
    fs.copyFileSync(BINARY_DEST, BINARY_BACKUP);
    console.log("Saved better-sqlite3 binary to persistent disk for future deploys.");
  } catch (e) {
    console.error("Could not save binary backup:", e.message);
  }
}

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_FILE = path.join(DATA_DIR, "ledger.db");

let db;
try {
  const Database = require("better-sqlite3");
  db = new Database(DB_FILE);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
} catch (e) {
  console.error("FATAL: better-sqlite3 failed to load:", e.message);
  console.error("Binary path checked:", BINARY_DEST);
  process.exit(1);
}

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY, name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  address TEXT DEFAULT '', phone TEXT DEFAULT '',
  logo_url TEXT DEFAULT '', notes TEXT DEFAULT '',
  pin_hash TEXT DEFAULT '', created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'cash',
  opening_balance REAL NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_accounts_biz ON accounts(business_id);
CREATE TABLE IF NOT EXISTS account_transfers (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  from_account_id TEXT NOT NULL, to_account_id TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0, date TEXT NOT NULL,
  notes TEXT DEFAULT '', created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_transfers_biz ON account_transfers(business_id);
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '', mobile TEXT DEFAULT '',
  r_sph TEXT DEFAULT '', r_cyl TEXT DEFAULT '',
  r_axis TEXT DEFAULT '', r_add TEXT DEFAULT '',
  l_sph TEXT DEFAULT '', l_cyl TEXT DEFAULT '',
  l_axis TEXT DEFAULT '', l_add TEXT DEFAULT '',
  notes TEXT DEFAULT '', created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_customers_biz ON customers(business_id);
CREATE TABLE IF NOT EXISTS income (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_name TEXT DEFAULT '', date TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  account_id TEXT DEFAULT '', notes TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_income_biz ON income(business_id);
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  expense_name TEXT DEFAULT '', date TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'Business',
  account_id TEXT DEFAULT '', notes TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_expenses_biz ON expenses(business_id);
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_no TEXT, customer_id TEXT, sale_date TEXT NOT NULL,
  customer_name TEXT DEFAULT '', mobile TEXT DEFAULT '',
  r_sph TEXT DEFAULT '', r_cyl TEXT DEFAULT '',
  r_axis TEXT DEFAULT '', r_add TEXT DEFAULT '',
  l_sph TEXT DEFAULT '', l_cyl TEXT DEFAULT '',
  l_axis TEXT DEFAULT '', l_add TEXT DEFAULT '',
  lens_quality TEXT DEFAULT '',
  frame_price REAL DEFAULT 0, lens_price REAL DEFAULT 0,
  subtotal REAL DEFAULT 0, discount_pct REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0, total REAL DEFAULT 0,
  delivery_date TEXT DEFAULT '', status TEXT DEFAULT 'Pending',
  notes TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_sales_biz ON sales(business_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  sale_id TEXT NOT NULL, invoice_no TEXT,
  customer_name TEXT DEFAULT '', date TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  method TEXT DEFAULT 'Cash',
  account_id TEXT DEFAULT '',
  kind TEXT DEFAULT 'Balance'
);
CREATE INDEX IF NOT EXISTS idx_payments_biz ON payments(business_id);
CREATE INDEX IF NOT EXISTS idx_payments_sale ON payments(sale_id);
CREATE TABLE IF NOT EXISTS day_closings (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  date TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open',
  notes TEXT DEFAULT '', difference REAL DEFAULT 0,
  closed_at TEXT DEFAULT '', created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_closings_biz ON day_closings(business_id);
CREATE TABLE IF NOT EXISTS day_closing_balances (
  id TEXT PRIMARY KEY,
  closing_id TEXT NOT NULL REFERENCES day_closings(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL, account_name TEXT NOT NULL,
  expected REAL DEFAULT 0, actual REAL DEFAULT 0, difference REAL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_dcb_closing ON day_closing_balances(closing_id);
CREATE TABLE IF NOT EXISTS loans (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                 -- 'lent' (receivable, I gave money) or 'borrowed' (payable, I took money)
  person_name TEXT NOT NULL DEFAULT '',
  customer_id TEXT DEFAULT '',        -- optional link to a customer profile
  amount REAL NOT NULL DEFAULT 0,     -- original principal amount
  date TEXT NOT NULL,
  account_id TEXT DEFAULT '',         -- account money left from / came into
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open', -- 'open' or 'settled'
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_loans_biz ON loans(business_id);
CREATE INDEX IF NOT EXISTS idx_loans_customer ON loans(customer_id);
CREATE TABLE IF NOT EXISTS loan_payments (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  loan_id TEXT NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  amount REAL NOT NULL DEFAULT 0,
  date TEXT NOT NULL,
  account_id TEXT DEFAULT '',
  notes TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan ON loan_payments(loan_id);
`);

const migrations = [
  "ALTER TABLE businesses ADD COLUMN pin_hash TEXT DEFAULT ''",
  "ALTER TABLE expenses ADD COLUMN category TEXT NOT NULL DEFAULT 'Business'",
  "ALTER TABLE expenses ADD COLUMN account_id TEXT DEFAULT ''",
  "ALTER TABLE income ADD COLUMN account_id TEXT DEFAULT ''",
  "ALTER TABLE payments ADD COLUMN account_id TEXT DEFAULT ''",
  "ALTER TABLE customers ADD COLUMN r_sph TEXT DEFAULT ''",
  "ALTER TABLE customers ADD COLUMN r_cyl TEXT DEFAULT ''",
  "ALTER TABLE customers ADD COLUMN r_axis TEXT DEFAULT ''",
  "ALTER TABLE customers ADD COLUMN r_add TEXT DEFAULT ''",
  "ALTER TABLE customers ADD COLUMN l_sph TEXT DEFAULT ''",
  "ALTER TABLE customers ADD COLUMN l_cyl TEXT DEFAULT ''",
  "ALTER TABLE customers ADD COLUMN l_axis TEXT DEFAULT ''",
  "ALTER TABLE customers ADD COLUMN l_add TEXT DEFAULT ''",
];
migrations.forEach(sql => { try { db.exec(sql); } catch (_) {} });

module.exports = db;

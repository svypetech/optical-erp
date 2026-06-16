const db = require("./db");
const ExcelJS = require("exceljs");

const newId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const todayStr = () => new Date().toISOString().slice(0, 10);
const normMobile = (m) => String(m || "").replace(/\D/g, "");

const PAY_METHODS = ["POS", "EasyPaisa", "JazzCash", "Bank", "Cash USD", "Crypto USDT (Binance)"];

// ---- row mappers (snake_case DB -> camelCase API) -------------------------
const mapBusiness = (r) => r && ({
  id: r.id, name: r.name, currency: r.currency, address: r.address || "",
  phone: r.phone || "", logoUrl: r.logo_url || "", notes: r.notes || "",
  pinHash: r.pin_hash || "",
  createdAt: r.created_at,
});
const mapCustomerBase = (r) => r && ({
  id: r.id, name: r.name, mobile: r.mobile || "",
  rSph: r.r_sph || "", rCyl: r.r_cyl || "", rAxis: r.r_axis || "", rAdd: r.r_add || "",
  lSph: r.l_sph || "", lCyl: r.l_cyl || "", lAxis: r.l_axis || "", lAdd: r.l_add || "",
  notes: r.notes || "", createdAt: r.created_at,
});
const mapIncome = (r) => ({ id: r.id, customerName: r.customer_name || "", date: String(r.date), amount: Number(r.amount) || 0, notes: r.notes || "" });
const mapExpense = (r) => ({ id: r.id, expenseName: r.expense_name || "", date: String(r.date), amount: Number(r.amount) || 0, notes: r.notes || "" });
const mapPayment = (r) => ({ id: r.id, saleId: r.sale_id, invoiceNo: r.invoice_no, customerName: r.customer_name || "", date: String(r.date), amount: Number(r.amount) || 0, method: r.method, kind: r.kind });
const mapSaleBase = (r) => ({
  id: r.id, invoiceNo: r.invoice_no, customerId: r.customer_id || "", saleDate: String(r.sale_date),
  customerName: r.customer_name || "", mobile: r.mobile || "",
  rSph: r.r_sph || "", rCyl: r.r_cyl || "", rAxis: r.r_axis || "", rAdd: r.r_add || "",
  lSph: r.l_sph || "", lCyl: r.l_cyl || "", lAxis: r.l_axis || "", lAdd: r.l_add || "",
  lensQuality: r.lens_quality || "",
  framePrice: Number(r.frame_price) || 0, lensPrice: Number(r.lens_price) || 0,
  subtotal: Number(r.subtotal) || 0, discountPct: Number(r.discount_pct) || 0,
  discountAmount: Number(r.discount_amount) || 0, total: Number(r.total) || 0,
  deliveryDate: r.delivery_date || "", status: r.status || "Pending", notes: r.notes || "",
});

// ===========================================================================
// USER
// ===========================================================================
async function getUser() {
  return db.prepare("SELECT * FROM users LIMIT 1").get() || null;
}
async function createUser(email, passwordHash) {
  if (db.prepare("SELECT 1 FROM users LIMIT 1").get())
    throw new Error("A user already exists (single-user app).");
  const user = { id: newId(), email, passwordHash, createdAt: new Date().toISOString() };
  db.prepare("INSERT INTO users (id,email,password_hash,created_at) VALUES (?,?,?,?)")
    .run(user.id, email, passwordHash, user.createdAt);
  return user;
}

// ===========================================================================
// BUSINESS
// ===========================================================================
async function listBusinesses() {
  return db.prepare("SELECT * FROM businesses ORDER BY created_at").all().map(mapBusiness);
}
async function getBusiness(id) {
  return mapBusiness(db.prepare("SELECT * FROM businesses WHERE id=?").get(id));
}
async function createBusiness({ name, currency, notes, address, phone, logoUrl, pinHash }) {
  const b = { id: newId(), createdAt: new Date().toISOString() };
  db.prepare(`INSERT INTO businesses (id,name,currency,address,phone,logo_url,notes,pin_hash,created_at)
              VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(b.id, name, currency || "USD", address || "", phone || "", logoUrl || "", notes || "", pinHash || "", b.createdAt);
  return getBusiness(b.id);
}
async function updateBusiness(id, patch) {
  const cur = db.prepare("SELECT * FROM businesses WHERE id=?").get(id);
  if (!cur) return null;
  const next = {
    name: patch.name ?? cur.name,
    currency: patch.currency ?? cur.currency,
    address: patch.address ?? cur.address,
    phone: patch.phone ?? cur.phone,
    logo_url: patch.logoUrl !== undefined ? patch.logoUrl : cur.logo_url,
    notes: patch.notes ?? cur.notes,
    pin_hash: patch.pinHash !== undefined ? patch.pinHash : cur.pin_hash,
  };
  db.prepare(`UPDATE businesses SET name=?,currency=?,address=?,phone=?,logo_url=?,notes=?,pin_hash=? WHERE id=?`)
    .run(next.name, next.currency, next.address, next.phone, next.logo_url, next.notes, next.pin_hash, id);
  return getBusiness(id);
}
async function deleteBusiness(id) {
  db.prepare("DELETE FROM businesses WHERE id=?").run(id); // cascades
  return true;
}

// ===========================================================================
// INCOME
// ===========================================================================
async function listIncome(businessId) {
  return db.prepare("SELECT * FROM income WHERE business_id=? ORDER BY date DESC").all(businessId).map(mapIncome);
}
async function addIncome(businessId, e) {
  const row = { id: newId(), customerName: e.customerName || "", date: e.date || todayStr(), amount: Number(e.amount) || 0, notes: e.notes || "" };
  db.prepare("INSERT INTO income (id,business_id,customer_name,date,amount,notes) VALUES (?,?,?,?,?,?)")
    .run(row.id, businessId, row.customerName, row.date, row.amount, row.notes);
  return row;
}
async function updateIncome(businessId, id, patch) {
  const cur = db.prepare("SELECT * FROM income WHERE id=? AND business_id=?").get(id, businessId);
  if (!cur) return null;
  const next = {
    customer_name: patch.customerName ?? cur.customer_name,
    date: patch.date ?? cur.date,
    amount: patch.amount !== undefined ? Number(patch.amount) : cur.amount,
    notes: patch.notes ?? cur.notes,
  };
  db.prepare("UPDATE income SET customer_name=?,date=?,amount=?,notes=? WHERE id=?")
    .run(next.customer_name, next.date, next.amount, next.notes, id);
  return mapIncome(db.prepare("SELECT * FROM income WHERE id=?").get(id));
}
async function deleteIncome(businessId, id) {
  db.prepare("DELETE FROM income WHERE id=? AND business_id=?").run(id, businessId);
  return true;
}

// ===========================================================================
// EXPENSES
// ===========================================================================
async function listExpenses(businessId) {
  return db.prepare("SELECT * FROM expenses WHERE business_id=? ORDER BY date DESC").all(businessId).map(mapExpense);
}
async function addExpense(businessId, e) {
  const row = { id: newId(), expenseName: e.expenseName || "", date: e.date || todayStr(), amount: Number(e.amount) || 0, notes: e.notes || "" };
  db.prepare("INSERT INTO expenses (id,business_id,expense_name,date,amount,notes) VALUES (?,?,?,?,?,?)")
    .run(row.id, businessId, row.expenseName, row.date, row.amount, row.notes);
  return row;
}
async function updateExpense(businessId, id, patch) {
  const cur = db.prepare("SELECT * FROM expenses WHERE id=? AND business_id=?").get(id, businessId);
  if (!cur) return null;
  const next = {
    expense_name: patch.expenseName ?? cur.expense_name,
    date: patch.date ?? cur.date,
    amount: patch.amount !== undefined ? Number(patch.amount) : cur.amount,
    notes: patch.notes ?? cur.notes,
  };
  db.prepare("UPDATE expenses SET expense_name=?,date=?,amount=?,notes=? WHERE id=?")
    .run(next.expense_name, next.date, next.amount, next.notes, id);
  return mapExpense(db.prepare("SELECT * FROM expenses WHERE id=?").get(id));
}
async function deleteExpense(businessId, id) {
  db.prepare("DELETE FROM expenses WHERE id=? AND business_id=?").run(id, businessId);
  return true;
}

// ===========================================================================
// PAYMENTS
// ===========================================================================
async function listPayments(businessId) {
  return db.prepare("SELECT * FROM payments WHERE business_id=? ORDER BY date DESC").all(businessId).map(mapPayment);
}

// ===========================================================================
// CUSTOMERS
// ===========================================================================
function customerTotals(businessId, customerId) {
  const billed = db.prepare("SELECT COALESCE(SUM(total),0) t, COUNT(*) c FROM sales WHERE business_id=? AND customer_id=?")
    .get(businessId, customerId);
  const paid = db.prepare(`
    SELECT COALESCE(SUM(p.amount),0) t FROM payments p
    JOIN sales s ON s.id = p.sale_id
    WHERE s.business_id=? AND s.customer_id=?`).get(businessId, customerId);
  return { salesCount: billed.c, totalBilled: billed.t, totalPaid: paid.t, totalDue: billed.t - paid.t };
}
async function listCustomers(businessId) {
  return db.prepare("SELECT * FROM customers WHERE business_id=? ORDER BY name").all(businessId).map((r) => {
    const base = mapCustomerBase(r);
    return { ...base, ...customerTotals(businessId, r.id) };
  });
}
async function findCustomerByNameMobile(businessId, name, mobile) {
  const n = String(name || "").trim().toLowerCase();
  const m = normMobile(mobile);
  const rows = db.prepare("SELECT * FROM customers WHERE business_id=?").all(businessId);
  const found = rows.find((c) => String(c.name).trim().toLowerCase() === n && normMobile(c.mobile) === m);
  if (!found) return null;
  return { ...mapCustomerBase(found), ...customerTotals(businessId, found.id) };
}
async function createCustomer(businessId, c) {
  const id = newId();
  db.prepare(`INSERT INTO customers (id,business_id,name,mobile,r_sph,r_cyl,r_axis,r_add,l_sph,l_cyl,l_axis,l_add,notes,created_at)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, businessId, c.name || "", c.mobile || "",
      c.rSph || "", c.rCyl || "", c.rAxis || "", c.rAdd || "",
      c.lSph || "", c.lCyl || "", c.lAxis || "", c.lAdd || "",
      c.notes || "", new Date().toISOString());
  return mapCustomerBase(db.prepare("SELECT * FROM customers WHERE id=?").get(id));
}
async function updateCustomer(businessId, id, patch) {
  const cur = db.prepare("SELECT * FROM customers WHERE id=? AND business_id=?").get(id, businessId);
  if (!cur) return null;
  const f = (camel, snake) => (patch[camel] !== undefined ? patch[camel] : cur[snake]);
  db.prepare(`UPDATE customers SET name=?,mobile=?,r_sph=?,r_cyl=?,r_axis=?,r_add=?,l_sph=?,l_cyl=?,l_axis=?,l_add=?,notes=? WHERE id=?`)
    .run(f("name","name"), f("mobile","mobile"),
      f("rSph","r_sph"), f("rCyl","r_cyl"), f("rAxis","r_axis"), f("rAdd","r_add"),
      f("lSph","l_sph"), f("lCyl","l_cyl"), f("lAxis","l_axis"), f("lAdd","l_add"),
      f("notes","notes"), id);
  return mapCustomerBase(db.prepare("SELECT * FROM customers WHERE id=?").get(id));
}
async function getCustomerLedger(businessId, customerId) {
  const c = db.prepare("SELECT * FROM customers WHERE id=? AND business_id=?").get(customerId, businessId);
  if (!c) return null;
  const sales = await listSales(businessId).then((all) => all.filter((s) => String(s.customerId) === String(customerId)));
  const payments = db.prepare(`
    SELECT p.* FROM payments p JOIN sales s ON s.id=p.sale_id
    WHERE s.business_id=? AND s.customer_id=? ORDER BY p.date DESC`).all(businessId, customerId).map(mapPayment);
  const totalBilled = sales.reduce((a, s) => a + s.total, 0);
  const totalPaid = sales.reduce((a, s) => a + s.paid, 0);
  return { customer: mapCustomerBase(c), sales, payments, totalBilled, totalPaid, totalDue: totalBilled - totalPaid };
}

// ===========================================================================
// SALES
// ===========================================================================
function nextInvoiceNo(businessId) {
  const rows = db.prepare("SELECT invoice_no FROM sales WHERE business_id=?").all(businessId);
  let max = 0;
  rows.forEach((r) => { const m = String(r.invoice_no || "").match(/(\d+)/); if (m) max = Math.max(max, Number(m[1])); });
  return "INV-" + String(max + 1).padStart(4, "0");
}
function paidForSale(saleId) {
  return Number(db.prepare("SELECT COALESCE(SUM(amount),0) t FROM payments WHERE sale_id=?").get(saleId).t) || 0;
}
async function listSales(businessId) {
  return db.prepare("SELECT * FROM sales WHERE business_id=? ORDER BY sale_date DESC, invoice_no DESC").all(businessId).map((r) => {
    const base = mapSaleBase(r);
    const paid = paidForSale(r.id);
    return { ...base, paid, due: base.total - paid };
  });
}
async function getSale(businessId, id) {
  const r = db.prepare("SELECT * FROM sales WHERE id=? AND business_id=?").get(id, businessId);
  if (!r) return null;
  const base = mapSaleBase(r);
  const paid = paidForSale(id);
  const payments = db.prepare("SELECT * FROM payments WHERE sale_id=? ORDER BY date").all(id).map(mapPayment);
  return { ...base, paid, due: base.total - paid, payments };
}

async function createSaleImpl(businessId, data) {
  const rxFields = {
    rSph: data.rSph || "", rCyl: data.rCyl || "", rAxis: data.rAxis || "", rAdd: data.rAdd || "",
    lSph: data.lSph || "", lCyl: data.lCyl || "", lAxis: data.lAxis || "", lAdd: data.lAdd || "",
  };
  const hasRx = Object.values(rxFields).some((v) => String(v).trim() !== "");

  // resolve/create customer
  let customerId = data.customerId || "";
  if (!customerId && (data.customerName || data.mobile)) {
    const rows = db.prepare("SELECT * FROM customers WHERE business_id=?").all(businessId);
    const existing = rows.find((c) =>
      String(c.name).trim().toLowerCase() === String(data.customerName || "").trim().toLowerCase() &&
      normMobile(c.mobile) === normMobile(data.mobile));
    if (existing) customerId = existing.id;
    else {
      customerId = newId();
      db.prepare(`INSERT INTO customers (id,business_id,name,mobile,r_sph,r_cyl,r_axis,r_add,l_sph,l_cyl,l_axis,l_add,notes,created_at)
                  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(customerId, businessId, data.customerName || "", data.mobile || "",
          rxFields.rSph, rxFields.rCyl, rxFields.rAxis, rxFields.rAdd,
          rxFields.lSph, rxFields.lCyl, rxFields.lAxis, rxFields.lAdd, "", new Date().toISOString());
    }
  }
  if (customerId && hasRx) {
    db.prepare(`UPDATE customers SET r_sph=?,r_cyl=?,r_axis=?,r_add=?,l_sph=?,l_cyl=?,l_axis=?,l_add=? WHERE id=?`)
      .run(rxFields.rSph, rxFields.rCyl, rxFields.rAxis, rxFields.rAdd,
        rxFields.lSph, rxFields.lCyl, rxFields.lAxis, rxFields.lAdd, customerId);
  }

  const framePrice = Number(data.framePrice) || 0;
  const lensPrice = Number(data.lensPrice) || 0;
  const subtotal = framePrice + lensPrice;
  let discountPct = Number(data.discountPct) || 0;
  if (discountPct < 0) discountPct = 0;
  if (discountPct > 100) discountPct = 100;
  const discountAmount = Math.round((subtotal * discountPct) / 100 * 100) / 100;
  const total = subtotal - discountAmount;
  const advance = Number(data.advance) || 0;
  const saleId = newId();
  const invoiceNo = nextInvoiceNo(businessId);
  const saleDate = data.saleDate || todayStr();
  const status = advance >= total ? "Cleared" : "Pending";

  db.prepare(`INSERT INTO sales
    (id,business_id,invoice_no,customer_id,sale_date,customer_name,mobile,
     r_sph,r_cyl,r_axis,r_add,l_sph,l_cyl,l_axis,l_add,lens_quality,
     frame_price,lens_price,subtotal,discount_pct,discount_amount,total,delivery_date,status,notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(saleId, businessId, invoiceNo, customerId, saleDate, data.customerName || "", data.mobile || "",
      rxFields.rSph, rxFields.rCyl, rxFields.rAxis, rxFields.rAdd,
      rxFields.lSph, rxFields.lCyl, rxFields.lAxis, rxFields.lAdd, data.lensQuality || "",
      framePrice, lensPrice, subtotal, discountPct, discountAmount, total, data.deliveryDate || "", status, data.notes || "");

  if (advance > 0) {
    db.prepare(`INSERT INTO payments (id,business_id,sale_id,invoice_no,customer_name,date,amount,method,kind)
                VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(newId(), businessId, saleId, invoiceNo, data.customerName || "", saleDate, advance,
        PAY_METHODS.includes(data.advanceMethod) ? data.advanceMethod : "POS", "Advance");
  }
  return getSale(businessId, saleId);
}

async function addSalePayment(businessId, saleId, { amount, method, date, kind }) {
  const sale = db.prepare("SELECT * FROM sales WHERE id=? AND business_id=?").get(saleId, businessId);
  if (!sale) return null;
  const payDate = date || todayStr();
  db.prepare(`INSERT INTO payments (id,business_id,sale_id,invoice_no,customer_name,date,amount,method,kind)
              VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(newId(), businessId, saleId, sale.invoice_no, sale.customer_name, payDate, Number(amount) || 0,
      PAY_METHODS.includes(method) ? method : "POS", kind || "Balance");
  const paid = paidForSale(saleId);
  const status = paid >= Number(sale.total) ? "Cleared" : "Pending";
  const delivery = sale.delivery_date || (date || "");
  db.prepare("UPDATE sales SET status=?, delivery_date=? WHERE id=?").run(status, delivery, saleId);
  return getSale(businessId, saleId);
}

async function deleteSale(businessId, id) {
  db.prepare("DELETE FROM payments WHERE sale_id=? AND business_id=?").run(id, businessId);
  db.prepare("DELETE FROM sales WHERE id=? AND business_id=?").run(id, businessId);
  return true;
}

// ===========================================================================
// EXPORT — build an .xlsx on demand from the DB
// ===========================================================================
async function buildWorkbook(businessId) {
  const wb = new ExcelJS.Workbook();
  const income = await listIncome(businessId);
  const expenses = await listExpenses(businessId);
  const sales = await listSales(businessId);
  const payments = await listPayments(businessId);

  const inc = wb.addWorksheet("Income");
  inc.columns = [
    { header: "Customer Name", key: "customerName", width: 26 },
    { header: "Date", key: "date", width: 14 },
    { header: "Amount", key: "amount", width: 14 },
    { header: "Notes", key: "notes", width: 36 },
  ];
  income.forEach((r) => inc.addRow(r));

  const exp = wb.addWorksheet("Expenses");
  exp.columns = [
    { header: "Expense Name", key: "expenseName", width: 26 },
    { header: "Date", key: "date", width: 14 },
    { header: "Amount", key: "amount", width: 14 },
    { header: "Notes", key: "notes", width: 36 },
  ];
  expenses.forEach((r) => exp.addRow(r));

  const sal = wb.addWorksheet("Sales");
  sal.columns = [
    { header: "Invoice", key: "invoiceNo", width: 12 },
    { header: "Date", key: "saleDate", width: 14 },
    { header: "Customer", key: "customerName", width: 24 },
    { header: "Mobile", key: "mobile", width: 16 },
    { header: "Frame", key: "framePrice", width: 12 },
    { header: "Lens", key: "lensPrice", width: 12 },
    { header: "Discount %", key: "discountPct", width: 11 },
    { header: "Total", key: "total", width: 12 },
    { header: "Paid", key: "paid", width: 12 },
    { header: "Due", key: "due", width: 12 },
    { header: "Status", key: "status", width: 10 },
  ];
  sales.forEach((s) => sal.addRow({ ...s, status: s.due <= 0 ? "Cleared" : "Pending" }));

  const pay = wb.addWorksheet("Payments");
  pay.columns = [
    { header: "Date", key: "date", width: 14 },
    { header: "Invoice", key: "invoiceNo", width: 12 },
    { header: "Customer", key: "customerName", width: 24 },
    { header: "Kind", key: "kind", width: 10 },
    { header: "Method", key: "method", width: 18 },
    { header: "Amount", key: "amount", width: 12 },
  ];
  payments.forEach((p) => pay.addRow(p));

  // Daily summary (income received + manual income vs expenses)
  const byDay = {};
  const addInc = (d, a) => { byDay[d] = byDay[d] || { income: 0, expenses: 0 }; byDay[d].income += a; };
  const addExp = (d, a) => { byDay[d] = byDay[d] || { income: 0, expenses: 0 }; byDay[d].expenses += a; };
  payments.forEach((p) => addInc(String(p.date), p.amount));
  income.forEach((r) => addInc(String(r.date), r.amount));
  expenses.forEach((r) => addExp(String(r.date), r.amount));
  const sum = wb.addWorksheet("Daily Summary");
  sum.columns = [
    { header: "Date", key: "date", width: 14 },
    { header: "Income", key: "income", width: 14 },
    { header: "Expenses", key: "expenses", width: 14 },
    { header: "Profit", key: "profit", width: 14 },
  ];
  Object.keys(byDay).sort().forEach((d) =>
    sum.addRow({ date: d, income: byDay[d].income, expenses: byDay[d].expenses, profit: byDay[d].income - byDay[d].expenses }));

  return wb;
}

// Writes the workbook to a temp file and returns its path (for streaming).
const os = require("os");
const path = require("path");
async function getBusinessFilePath(businessId) {
  const wb = await buildWorkbook(businessId);
  const tmp = path.join(os.tmpdir(), `business_${businessId}_${Date.now()}.xlsx`);
  await wb.xlsx.writeFile(tmp);
  return tmp;
}

module.exports = {
  getUser, createUser,
  listBusinesses, getBusiness, createBusiness, updateBusiness, deleteBusiness,
  listIncome, addIncome, updateIncome, deleteIncome,
  listExpenses, addExpense, updateExpense, deleteExpense,
  listSales, getSale, createSale: createSaleImpl, addSalePayment, deleteSale, listPayments,
  listCustomers, findCustomerByNameMobile, createCustomer, updateCustomer, getCustomerLedger,
  getBusinessFilePath,
};

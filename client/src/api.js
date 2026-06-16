const BASE = "/api";

function getToken() {
  return localStorage.getItem("bl_token");
}

async function request(path, { method = "GET", body, raw = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers["Content-Type"] = "application/json";

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (raw) return res; // for file downloads

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  // auth
  status: () => request("/auth/status"),
  register: (email, password) =>
    request("/auth/register", { method: "POST", body: { email, password } }),
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: { email, password } }),

  // businesses
  listBusinesses: () => request("/businesses"),
  createBusiness: (b) => request("/businesses", { method: "POST", body: b }),
  updateBusiness: (id, b) => request(`/businesses/${id}`, { method: "PUT", body: b }),
  deleteBusiness: (id) => request(`/businesses/${id}`, { method: "DELETE" }),
  verifyPin: (id, pin, newPin) => request(`/businesses/${id}/verify-pin`, { method: "POST", body: { pin, newPin } }),
  changePin: (id, currentPin, newPin) => request(`/businesses/${id}/change-pin`, { method: "POST", body: { currentPin, newPin } }),

  // income
  listIncome: (bid) => request(`/businesses/${bid}/income`),
  listIncomeAll: (bid) => request(`/businesses/${bid}/income/all`),
  addIncome: (bid, e) => request(`/businesses/${bid}/income`, { method: "POST", body: e }),
  updateIncome: (bid, id, e) =>
    request(`/businesses/${bid}/income/${id}`, { method: "PUT", body: e }),
  deleteIncome: (bid, id) =>
    request(`/businesses/${bid}/income/${id}`, { method: "DELETE" }),

  // expenses
  listExpenses: (bid) => request(`/businesses/${bid}/expenses`),
  addExpense: (bid, e) =>
    request(`/businesses/${bid}/expenses`, { method: "POST", body: e }),
  updateExpense: (bid, id, e) =>
    request(`/businesses/${bid}/expenses/${id}`, { method: "PUT", body: e }),
  deleteExpense: (bid, id) =>
    request(`/businesses/${bid}/expenses/${id}`, { method: "DELETE" }),

  // sales (optical)
  listSales: (bid) => request(`/businesses/${bid}/sales`),
  getSale: (bid, id) => request(`/businesses/${bid}/sales/${id}`),
  createSale: (bid, s) => request(`/businesses/${bid}/sales`, { method: "POST", body: s }),
  addSalePayment: (bid, id, p) =>
    request(`/businesses/${bid}/sales/${id}/payment`, { method: "POST", body: p }),
  deleteSale: (bid, id) => request(`/businesses/${bid}/sales/${id}`, { method: "DELETE" }),

  // customers
  listCustomers: (bid) => request(`/businesses/${bid}/customers`),
  matchCustomer: (bid, name, mobile) =>
    request(`/businesses/${bid}/customers/match?name=${encodeURIComponent(name || "")}&mobile=${encodeURIComponent(mobile || "")}`),
  customerLedger: (bid, id) => request(`/businesses/${bid}/customers/${id}/ledger`),
  createCustomer: (bid, c) => request(`/businesses/${bid}/customers`, { method: "POST", body: c }),
  updateCustomer: (bid, id, c) =>
    request(`/businesses/${bid}/customers/${id}`, { method: "PUT", body: c }),

  // reports
  dashboard: (bid) => request(`/businesses/${bid}/reports/dashboard`),
  summary: (bid) => request(`/businesses/${bid}/reports/summary`),

  // export (returns URL with token-less path; uses fetch + blob)
  exportUrl: (bid, kind) => `${BASE}/businesses/${bid}/export/${kind}`,
  download: async (bid, kind, filename, params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v)
    ).toString();
    const path = `/businesses/${bid}/export/${kind}${qs ? `?${qs}` : ""}`;
    const res = await request(path, { raw: true });
    if (!res.ok) throw new Error("Export failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};

export { getToken };

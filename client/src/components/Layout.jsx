import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { Button } from "./ui";
import PinLock from "./PinLock";
import BusinessPicker from "./BusinessPicker";

const links = [
  { to: "/", label: "Dashboard", icon: "▦", end: true },
  { to: "/sales", label: "Sales", icon: "◉" },
  { to: "/customers", label: "Customers", icon: "☺" },
  { to: "/promotions", label: "Promotions", icon: "✦" },
  { to: "/accounts", label: "Accounts", icon: "🏦" },
  { to: "/transfers", label: "Transfers", icon: "⇄" },
  { to: "/income", label: "Income", icon: "↑" },
  { to: "/expenses", label: "Expenses", icon: "↓" },
  { to: "/dayclose", label: "Day Closing", icon: "✓" },
  { to: "/pnl", label: "P&L / Aging", icon: "▤" },
  { to: "/reports", label: "Reports", icon: "▣" },
  { to: "/businesses", label: "Businesses", icon: "⚙" },
];

export default function Layout({ children }) {
  const { email, logout, dark, setDark, businesses, activeId, selectBusiness,
          pinLock, pinBusiness, onPinUnlocked } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const SidebarInner = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 py-5 text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 text-white">
          ₿
        </span>
        Business Ledger
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition " +
              (isActive
                ? "bg-indigo-50 text-indigo-700 dark:bg-slate-700 dark:text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700")
            }
          >
            <span className="w-4 text-center">{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-200 px-4 py-4 dark:border-slate-700">
        <div className="mb-2 truncate text-xs text-slate-500 dark:text-slate-400">{email}</div>
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => {
            logout();
            navigate("/login");
          }}
        >
          Log out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 md:block">
        {SidebarInner}
      </aside>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <aside className="absolute left-0 top-0 h-full w-60 bg-white dark:bg-slate-800" onClick={(e) => e.stopPropagation()}>
            {SidebarInner}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
          <button
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 md:hidden"
            onClick={() => setOpen(true)}
          >
            ☰
          </button>

          <select
            value={activeId || ""}
            onChange={(e) => selectBusiness(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
          >
            {businesses.length === 0 && <option value="">No businesses yet</option>}
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <div className="flex-1" />

          <button
            onClick={() => setDark(!dark)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
            title="Toggle theme"
          >
            {dark ? "☀" : "☾"}
          </button>
        </header>

        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>

      {/* Business picker — shown after login so user chooses which business to open */}
      {pinLock === "select" && <BusinessPicker />}

      {/* PIN lock overlay — covers everything when locked */}
      {pinLock && pinLock !== "select" && pinBusiness && (
        <PinLock
          business={pinBusiness}
          onUnlock={onPinUnlocked}
          reason={pinLock}
        />
      )}
    </div>
  );
}

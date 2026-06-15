import React from "react";

export const currencySymbol = (cur) => {
  const map = { USD: "$", EUR: "€", GBP: "£", PKR: "₨", INR: "₹", JPY: "¥", AUD: "A$", CAD: "C$" };
  return map[cur] || (cur ? cur + " " : "$");
};

export const fmtMoney = (n, cur = "USD") =>
  currencySymbol(cur) +
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export function Card({ children, className = "" }) {
  return (
    <div
      className={
        "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 " +
        className
      }
    >
      {children}
    </div>
  );
}

export function Stat({ label, value, accent = "text-slate-900 dark:text-white" }) {
  return (
    <Card>
      <div className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</div>
      <div className={"mt-2 text-2xl font-bold tracking-tight " + accent}>{value}</div>
    </Card>
  );
}

export function Button({ children, variant = "primary", className = "", ...props }) {
  const styles = {
    primary:
      "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50",
    secondary:
      "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
    ghost:
      "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ label, ...props }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
          {label}
        </span>
      )}
      <input
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:focus:ring-indigo-900"
        {...props}
      />
    </label>
  );
}

export function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

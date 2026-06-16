import React from "react";
import { useApp } from "../context/AppContext";

const TYPE_ICONS = { cash: "💵", bank: "🏦", mobile_wallet: "📱", crypto: "₿", other: "🏷" };

export default function BusinessPicker() {
  const { businesses, selectBusinessForLogin, logout } = useApp();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl dark:bg-slate-800">
        {/* Icon */}
        <div className="mb-4 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-3xl dark:bg-indigo-900/40">
            🏪
          </div>
        </div>

        <h2 className="mb-1 text-center text-xl font-bold text-slate-900 dark:text-white">
          Select Business
        </h2>
        <p className="mb-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Which business would you like to open?
        </p>

        <div className="space-y-3">
          {businesses.map((b) => (
            <button
              key={b.id}
              onClick={() => selectBusinessForLogin(b.id)}
              className="flex w-full items-center gap-4 rounded-xl border-2 border-slate-200 bg-slate-50 p-4 text-left transition hover:border-indigo-400 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-500 dark:hover:bg-indigo-900/20"
            >
              {b.logoUrl ? (
                <img src={b.logoUrl} alt={b.name} className="h-10 w-10 rounded-lg object-contain" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-xl dark:bg-indigo-900/40">
                  🏪
                </div>
              )}
              <div className="flex-1">
                <div className="font-bold text-slate-900 dark:text-white">{b.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {b.currency} {b.address ? `• ${b.address}` : ""}
                </div>
              </div>
              <div className="text-slate-400">
                {b.hasPIN ? "🔒" : "🔑"}
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={logout}
          className="mt-5 w-full text-center text-xs text-slate-400 hover:underline dark:text-slate-500"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

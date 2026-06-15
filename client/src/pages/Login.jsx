import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useApp } from "../context/AppContext";
import { Button, Input } from "../components/ui";

export default function Login() {
  const { persistAuth } = useApp();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [hasAccount, setHasAccount] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .status()
      .then((s) => {
        setHasAccount(s.registered);
        // default the toggle sensibly: signup if no account yet, else login
        setMode(s.registered ? "login" : "signup");
      })
      .catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res =
        mode === "login"
          ? await api.login(email, password)
          : await api.register(email, password);
      persistAuth(res.token, res.email);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-900">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-6 flex items-center gap-2 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 text-white">
            ₿
          </span>
          Business Ledger
        </div>

        {/* Log in / Sign up toggle */}
        <div className="mb-5 inline-flex w-full rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900">
          {[
            { key: "login", label: "Log in" },
            { key: "signup", label: "Sign up" },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setMode(t.key);
                setError("");
              }}
              className={
                "flex-1 rounded-md px-4 py-1.5 text-sm font-semibold transition " +
                (mode === t.key
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 dark:text-slate-300")
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        <h1 className="mb-1 text-lg font-bold text-slate-900 dark:text-white">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
          {mode === "login"
            ? "Log in to manage your books."
            : hasAccount
            ? "An account already exists — switch to Log in to continue."
            : "Set up the single account for this app."}
        </p>

        <form onSubmit={submit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <div className="text-sm text-rose-600">{error}</div>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
          </Button>
        </form>
      </div>
    </div>
  );
}

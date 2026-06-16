import React, { useState, useEffect, useRef } from "react";
import { api } from "../api";

/**
 * Full-screen PIN lock overlay.
 * Props:
 *   business  — { id, name, hasPIN }
 *   onUnlock  — called when PIN verified/set
 *   reason    — "login" | "inactivity" | "switch"
 */
export default function PinLock({ business, onUnlock, reason }) {
  const isSetup = !business?.hasPIN; // no PIN set yet — setup mode
  const [step, setStep] = useState(isSetup ? "set" : "enter"); // "enter"|"set"|"confirm"
  const [pin, setPin] = useState(["", "", "", ""]);
  const [firstPin, setFirstPin] = useState(""); // for confirm step
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);
  const [lockMsg, setLockMsg] = useState("");
  const inputs = useRef([]);

  useEffect(() => { inputs.current[0]?.focus(); }, [step]);

  const reasonLabel = isSetup
    ? "This business has no PIN yet. Set a 4-digit PIN to secure it."
    : {
        login: "Enter your PIN to access this business.",
        inactivity: "Screen locked. Enter PIN to continue.",
        switch: `Enter PIN to switch to "${business?.name}".`,
      }[reason] || "Enter your PIN.";

  const stepLabel = step === "set"
    ? "Set a new PIN"
    : step === "confirm"
    ? "Confirm your PIN"
    : "Enter PIN";

  const clearBoxes = () => {
    setPin(["", "", "", ""]);
    setTimeout(() => inputs.current[0]?.focus(), 50);
  };

  const handleKey = (i, e) => {
    const val = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...pin];
    next[i] = val;
    setPin(next);
    setError("");
    if (val && i < 3) inputs.current[i + 1]?.focus();
    if (val && i === 3) {
      const full = next.join("");
      if (full.length === 4) handleSubmit(full);
    }
  };

  const handleBackspace = (i, e) => {
    if (e.key === "Backspace" && !pin[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handleSubmit = async (code) => {
    const pinCode = code || pin.join("");
    if (pinCode.length !== 4) return;
    setLoading(true);
    setError("");

    try {
      if (step === "set") {
        // First entry for setup — go to confirm
        setFirstPin(pinCode);
        setStep("confirm");
        clearBoxes();
        setLoading(false);
        return;
      }

      if (step === "confirm") {
        if (pinCode !== firstPin) {
          setError("PINs don't match. Try again.");
          setFirstPin("");
          setStep("set");
          clearBoxes();
          setLoading(false);
          return;
        }
        // Send newPin to backend to save
        await api.verifyPin(business.id, undefined, pinCode);
        onUnlock();
        return;
      }

      // Normal enter step
      await api.verifyPin(business.id, pinCode);
      onUnlock();
    } catch (err) {
      const msg = err.message || "Wrong PIN.";
      setError(msg);
      clearBoxes();
      if (msg.includes("Locked") || msg.includes("locked")) {
        setLocked(true);
        setLockMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl dark:bg-slate-800">
        <div className="mb-4 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-3xl dark:bg-indigo-900/40">
            {isSetup ? "🔑" : "🔒"}
          </div>
        </div>

        <h2 className="mb-1 text-center text-xl font-bold text-slate-900 dark:text-white">
          {business?.name || "Business"}
        </h2>
        <p className="mb-2 text-center text-sm text-slate-500 dark:text-slate-400">
          {reasonLabel}
        </p>
        <p className="mb-5 text-center text-xs font-semibold text-indigo-600 dark:text-indigo-400">
          {stepLabel}
        </p>

        {locked ? (
          <div className="rounded-lg bg-rose-50 p-4 text-center text-sm font-semibold text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
            {lockMsg}
          </div>
        ) : (
          <>
            <div className="mb-4 flex justify-center gap-3">
              {pin.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => (inputs.current[i] = el)}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleKey(i, e)}
                  onKeyDown={(e) => handleBackspace(i, e)}
                  className="h-14 w-14 rounded-xl border-2 border-slate-300 bg-slate-50 text-center text-2xl font-bold text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />
              ))}
            </div>

            {error && (
              <p className="mb-3 text-center text-sm font-semibold text-rose-600 dark:text-rose-400">
                {error}
              </p>
            )}

            <button
              onClick={() => handleSubmit()}
              disabled={loading || pin.join("").length !== 4}
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white disabled:opacity-50 hover:bg-indigo-700"
            >
              {loading ? "Please wait…" : step === "set" ? "Next →" : step === "confirm" ? "Set PIN" : "Unlock"}
            </button>

            {step === "confirm" && (
              <button onClick={() => { setStep("set"); setFirstPin(""); clearBoxes(); setError(""); }}
                className="mt-2 w-full text-center text-xs text-slate-400 hover:underline">
                ← Start over
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { api } from "../api";

const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

const INACTIVITY_MS = 5 * 60 * 1000; // 5 minutes

export function AppProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("bl_token"));
  const [email, setEmail] = useState(() => localStorage.getItem("bl_email") || "");
  const [dark, setDark] = useState(() => localStorage.getItem("bl_dark") === "1");

  const [businesses, setBusinesses] = useState([]);
  const [activeId, setActiveId] = useState(null);

  // Flow states:
  // pinLock: null | "select" | "login" | "inactivity" | "switch"
  // "select" = show business picker
  // "login"  = business chosen, now enter PIN
  // "inactivity" = timed out, enter PIN for current business
  // "switch" = switching to different business, enter its PIN
  const [pinLock, setPinLock] = useState(null);
  const [pendingSwitchId, setPendingSwitchId] = useState(null);

  const inactivityTimer = useRef(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("bl_dark", dark ? "1" : "0");
  }, [dark]);

  // ---- Inactivity timer ----
  const resetTimer = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      if (activeId) setPinLock("inactivity");
    }, INACTIVITY_MS);
  };

  useEffect(() => {
    if (!token || !activeId || pinLock) return;
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [token, activeId, pinLock]);

  // ---- Auth ----
  const persistAuth = (tkn, mail) => {
    setToken(tkn);
    setEmail(mail);
    localStorage.setItem("bl_token", tkn);
    localStorage.setItem("bl_email", mail);
  };

  const logout = () => {
    setToken(null);
    setEmail("");
    setActiveId(null);
    setPinLock(null);
    setPendingSwitchId(null);
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    localStorage.removeItem("bl_token");
    localStorage.removeItem("bl_email");
    localStorage.removeItem("bl_active");
  };

  // ---- Businesses ----
  const refreshBusinesses = async () => {
    const list = await api.listBusinesses();
    setBusinesses(list);
    return list;
  };

  // After login: load businesses then show business picker
  useEffect(() => {
    if (!token) return;
    refreshBusinesses().then((list) => {
      if (list.length === 0) return;
      // Always show business picker on login — never auto-resume
      setActiveId(null);
      setPinLock("select");
    }).catch(() => {});
  }, [token]);

  // Called from BusinessPicker when a business is chosen
  const selectBusinessForLogin = (id) => {
    setPendingSwitchId(id);
    setPinLock("login");
  };

  // Switch to a different business while already in one
  const selectBusiness = (id) => {
    if (String(id) === String(activeId)) return;
    setPendingSwitchId(id);
    setPinLock("switch");
  };

  // Called by PinLock when correct PIN entered
  const onPinUnlocked = () => {
    const targetId = pendingSwitchId || activeId;
    setActiveId(targetId);
    localStorage.setItem("bl_active", targetId);
    setPendingSwitchId(null);
    setPinLock(null);
    resetTimer();
  };

  // The business we're entering PIN for
  const pinBusiness =
    pendingSwitchId
      ? businesses.find((b) => String(b.id) === String(pendingSwitchId))
      : businesses.find((b) => String(b.id) === String(activeId));

  return (
    <AppCtx.Provider value={{
      token, email, persistAuth, logout,
      dark, setDark,
      businesses, activeId,
      activeBusiness: businesses.find((b) => String(b.id) === String(activeId)) || null,
      selectBusiness, selectBusinessForLogin,
      refreshBusinesses,
      pinLock, pinBusiness, onPinUnlocked,
    }}>
      {children}
    </AppCtx.Provider>
  );
}

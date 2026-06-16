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
  const [activeId, setActiveId] = useState(() => localStorage.getItem("bl_active") || null);

  // PIN lock state
  // locked: "login" | "inactivity" | "switch" | null (null = unlocked)
  const [pinLock, setPinLock] = useState(null);
  // Which business are we trying to switch to (pending PIN)
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
    if (!token || !activeId) return;
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [token, activeId]);

  // ---- Auth ----
  const persistAuth = (tkn, mail) => {
    setToken(tkn);
    setEmail(mail);
    localStorage.setItem("bl_token", tkn);
    localStorage.setItem("bl_email", mail);
    // Will trigger refreshBusinesses via useEffect, which then triggers login PIN
  };

  const logout = () => {
    setToken(null);
    setEmail("");
    setPinLock(null);
    setPendingSwitchId(null);
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    localStorage.removeItem("bl_token");
    localStorage.removeItem("bl_email");
  };

  // ---- Businesses ----
  const refreshBusinesses = async () => {
    const list = await api.listBusinesses();
    setBusinesses(list);
    setActiveId((cur) => {
      const stillExists = cur && list.some((b) => String(b.id) === String(cur));
      const next = stillExists ? cur : (list[0]?.id || null);
      if (next) localStorage.setItem("bl_active", next);
      return next;
    });
    return list;
  };

  // After login: load businesses then immediately lock for PIN
  useEffect(() => {
    if (!token) return;
    refreshBusinesses().then((list) => {
      if (list.length > 0) setPinLock("login");
    }).catch(() => {});
  }, [token]);

  // selectBusiness: if switching to a DIFFERENT business, show PIN first
  const selectBusiness = (id) => {
    if (String(id) === String(activeId)) return; // same business, no PIN
    setPendingSwitchId(id);
    setPinLock("switch");
  };

  // Called by PinLock when correct PIN entered
  const onPinUnlocked = () => {
    if (pendingSwitchId) {
      setActiveId(pendingSwitchId);
      localStorage.setItem("bl_active", pendingSwitchId);
      setPendingSwitchId(null);
    }
    setPinLock(null);
    resetTimer();
  };

  const activeBusiness =
    businesses.find((b) => String(b.id) === String(
      pinLock === "switch" && pendingSwitchId ? pendingSwitchId : activeId
    )) || null;

  // The business to show on PIN lock screen
  const pinBusiness = pinLock === "switch" && pendingSwitchId
    ? businesses.find((b) => String(b.id) === String(pendingSwitchId))
    : businesses.find((b) => String(b.id) === String(activeId));

  return (
    <AppCtx.Provider
      value={{
        token,
        email,
        persistAuth,
        logout,
        dark,
        setDark,
        businesses,
        activeId,
        activeBusiness: businesses.find((b) => String(b.id) === String(activeId)) || null,
        selectBusiness,
        refreshBusinesses,
        pinLock,
        pinBusiness,
        onPinUnlocked,
      }}
    >
      {children}
    </AppCtx.Provider>
  );
}

import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api";

const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

export function AppProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("bl_token"));
  const [email, setEmail] = useState(() => localStorage.getItem("bl_email") || "");
  const [dark, setDark] = useState(() => localStorage.getItem("bl_dark") === "1");

  const [businesses, setBusinesses] = useState([]);
  const [activeId, setActiveId] = useState(
    () => localStorage.getItem("bl_active") || null
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("bl_dark", dark ? "1" : "0");
  }, [dark]);

  const persistAuth = (tkn, mail) => {
    setToken(tkn);
    setEmail(mail);
    localStorage.setItem("bl_token", tkn);
    localStorage.setItem("bl_email", mail);
  };

  const logout = () => {
    setToken(null);
    setEmail("");
    localStorage.removeItem("bl_token");
    localStorage.removeItem("bl_email");
  };

  const refreshBusinesses = async () => {
    const list = await api.listBusinesses();
    setBusinesses(list);
    setActiveId((cur) => {
      if (cur && list.some((b) => String(b.id) === String(cur))) return cur;
      const next = list[0]?.id || null;
      if (next) localStorage.setItem("bl_active", next);
      return next;
    });
    return list;
  };

  const selectBusiness = (id) => {
    setActiveId(id);
    localStorage.setItem("bl_active", id);
  };

  useEffect(() => {
    if (token) refreshBusinesses().catch(() => {});
  }, [token]);

  const activeBusiness =
    businesses.find((b) => String(b.id) === String(activeId)) || null;

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
        activeBusiness,
        selectBusiness,
        refreshBusinesses,
      }}
    >
      {children}
    </AppCtx.Provider>
  );
}

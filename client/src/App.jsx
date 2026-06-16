import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "./context/AppContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Sales from "./pages/Sales";
import Customers from "./pages/Customers";
import Promotions from "./pages/Promotions";
import Accounts from "./pages/Accounts";
import Transfers from "./pages/Transfers";
import Income from "./pages/Income";
import Expenses from "./pages/Expenses";
import DayClose from "./pages/DayClose";
import PnL from "./pages/PnL";
import Reports from "./pages/Reports";
import Businesses from "./pages/Businesses";

function Protected({ children }) {
  const { token } = useApp();
  if (!token) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function Shell() {
  const { token } = useApp();
  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/sales" element={<Protected><Sales /></Protected>} />
      <Route path="/customers" element={<Protected><Customers /></Protected>} />
      <Route path="/promotions" element={<Protected><Promotions /></Protected>} />
      <Route path="/accounts" element={<Protected><Accounts /></Protected>} />
      <Route path="/transfers" element={<Protected><Transfers /></Protected>} />
      <Route path="/income" element={<Protected><Income /></Protected>} />
      <Route path="/expenses" element={<Protected><Expenses /></Protected>} />
      <Route path="/dayclose" element={<Protected><DayClose /></Protected>} />
      <Route path="/pnl" element={<Protected><PnL /></Protected>} />
      <Route path="/reports" element={<Protected><Reports /></Protected>} />
      <Route path="/businesses" element={<Protected><Businesses /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </AppProvider>
  );
}

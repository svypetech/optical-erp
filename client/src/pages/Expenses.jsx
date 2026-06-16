import React from "react";
import LedgerPage from "./LedgerPage";
import { api } from "../api";

export default function Expenses() {
  return (
    <LedgerPage
      title="Expenses"
      nameField="expenseName"
      nameLabel="Expense Name"
      accent=""
      listFn={api.listExpenses}
      addFn={api.addExpense}
      updateFn={api.updateExpense}
      deleteFn={api.deleteExpense}
      showCategory={true}
    />
  );
}

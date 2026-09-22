import { useState } from "react";
import styled from "styled-components";

import Dashboard from "../pages/Dashboard";
import TransactionForm from "../pages/TransactionForm";
import History from "../pages/History";
import Categories from "../pages/Categories";
import Profile from "../pages/Profile";
import Recurring from "../pages/Recurring";

function Body({
  activePage, setActivityPage,
  toast, setToast,
  selectedMonth, setSelectedMonth, cycleDay,
  budgets, setBudgets,
  transactions, setTransactions,
  addTransaction, replaceTransaction, removeTransaction, restoreTransaction,
  recurringTemplates, setRecurringTemplates,
  addRecurring, replaceRecurring, removeRecurring,
  visibleTransactions,
  categories, setCategories,
  profile, setProfile,
  clearAllData,
}) {
  const [editTx, setEditTx] = useState(null);

  const handleAddTransaction = (transaction) => {
    if (transaction.recurring) {
      const { recurring: _, ...template } = transaction;
      addRecurring({ ...template, recurring: true });
    } else {
      addTransaction(transaction);
    }
  };

  const handleRemoveTransaction = (id) => {
    if (id.startsWith("recurring-")) {
      const templateId = id.split("-").slice(1, -1).join("-");
      removeRecurring(templateId);
    } else {
      removeTransaction(id);
    }
  };

  const handleRestoreTransaction = (tx) => {
    if (tx._isRecurringVirtual) return;
    restoreTransaction(tx);
  };

  const handleSetActivityPage = (value) => {
    if (value && typeof value === "object" && value.page === "edit") {
      setEditTx(value.tx);
      setActivityPage("edit");
    } else if (value && typeof value === "object" && value.page === "edit-recurring") {
      setEditTx(value.tx);
      setActivityPage("edit-recurring");
    } else if (value === "add-recurring") {
      setEditTx(null);
      setActivityPage("add-recurring");
    } else {
      setEditTx(null);
      setActivityPage(value);
    }
  };

  return (
    <BodyContainer>
      {activePage === "dashboard" && (
        <Dashboard
          transactions={visibleTransactions}
          allTransactions={visibleTransactions}
          setActivityPage={handleSetActivityPage}
          budgets={budgets}
          setBudgets={setBudgets}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          cycleDay={cycleDay}
          categories={categories}
          profile={profile}
        />
      )}

      {activePage === "add" && (
        <TransactionForm
          setActivityPage={handleSetActivityPage}
          toast={toast}
          setToast={setToast}
          addTransaction={handleAddTransaction}
          categories={categories}
          profile={profile}
        />
      )}

      {activePage === "edit" && editTx && (
        <TransactionForm
          setActivityPage={handleSetActivityPage}
          toast={toast}
          setToast={setToast}
          editTx={editTx}
          replaceTransaction={replaceTransaction}
          removeTransaction={(id) => { removeTransaction(id); handleSetActivityPage("history"); }}
          categories={categories}
          profile={profile}
        />
      )}

      {activePage === "recurring" && (
        <Recurring
          recurringTemplates={recurringTemplates}
          setActivityPage={handleSetActivityPage}
          categories={categories}
          profile={profile}
          onDeleteTemplate={(id) => removeRecurring(id)}
        />
      )}

      {activePage === "add-recurring" && (
        <TransactionForm
          setActivityPage={handleSetActivityPage}
          toast={toast}
          setToast={setToast}
          addTransaction={handleAddTransaction}
          categories={categories}
          profile={profile}
          recurringLocked
        />
      )}

      {activePage === "edit-recurring" && editTx && (
        <TransactionForm
          setActivityPage={handleSetActivityPage}
          toast={toast}
          setToast={setToast}
          editTx={editTx}
          replaceTransaction={replaceRecurring}
          removeTransaction={(id) => { removeRecurring(id); handleSetActivityPage("recurring"); }}
          categories={categories}
          profile={profile}
          recurringLocked
        />
      )}

      {activePage === "history" && (
        <History
          transactions={visibleTransactions}
          selectedMonth={selectedMonth}
          cycleDay={cycleDay}
          removeTransaction={handleRemoveTransaction}
          restoreTransaction={handleRestoreTransaction}
          setActivityPage={handleSetActivityPage}
          categories={categories}
          profile={profile}
        />
      )}

      {activePage === "categories" && (
        <Categories
          categories={categories}
          setCategories={setCategories}
          budgets={budgets}
          setBudgets={setBudgets}
          transactions={visibleTransactions}
          selectedMonth={selectedMonth}
          cycleDay={cycleDay}
        />
      )}

      {activePage === "profile" && (
        <Profile
          profile={profile}
          setProfile={setProfile}
          transactions={visibleTransactions}
          categories={categories}
          clearAllData={clearAllData}
        />
      )}
    </BodyContainer>
  );
}

export default Body;

const BodyContainer = styled.div`
  position: relative;
  width: 100%;
  box-sizing: border-box;
`;

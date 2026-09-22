import { useState } from "react";
import styled from "styled-components";

const EMOJI_LIST = ["🛒","🏠","🚗","📚","🤖","🎉","🏥","💊","🛍️","🔔","🏋","💍","🐷","📦","💼","🎁","➕","✈️","🍕","☕","🎮","💅","🐶","🌿","💡","🎓","🏖️","💳","🎵","📱"];

function Categories({ categories, setCategories, budgets, setBudgets, transactions, selectedMonth }) {
  const [tab, setTab] = useState("expense");
  const [showModal, setShowModal] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [draft, setDraft] = useState({ name: "", emoji: "📦", type: "expense" });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const displayed = categories.filter(c => c.type === tab);

  const getSpent = (catId) => {
    const monthTx = selectedMonth
      ? transactions.filter(tx => {
          const l = new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric" }).format(new Date(tx.date));
          return l === selectedMonth;
        })
      : transactions;
    return monthTx
      .filter(tx => tx.category === catId && tx.type === "expense")
      .reduce((s, tx) => s + Number(tx.amount), 0);
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(amount);

  const openAdd = () => {
    setEditingCat(null);
    setDraft({ name: "", emoji: "📦", type: tab });
    setShowModal(true);
  };

  const openEdit = (cat) => {
    setEditingCat(cat);
    setDraft({ name: cat.label, emoji: cat.emoji, type: cat.type, budget: budgets[cat.id] ?? "" });
    setShowModal(true);
  };

  const saveCategory = () => {
    if (!draft.name.trim()) return;
    if (editingCat) {
      setCategories(prev => prev.map(c =>
        c.id === editingCat.id
          ? { ...c, label: draft.name.trim(), emoji: draft.emoji, type: draft.type }
          : c
      ));
      if (draft.budget) {
        const n = parseFloat(draft.budget);
        if (n > 0) setBudgets(prev => ({ ...prev, [editingCat.id]: n }));
        else {
          setBudgets(prev => { const next = { ...prev }; delete next[editingCat.id]; return next; });
        }
      }
    } else {
      const newId = `cat_${Date.now()}`;
      setCategories(prev => [...prev, { id: newId, label: draft.name.trim(), emoji: draft.emoji, type: draft.type }]);
      if (draft.budget) {
        const n = parseFloat(draft.budget);
        if (n > 0) setBudgets(prev => ({ ...prev, [newId]: n }));
      }
    }
    setShowModal(false);
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    setCategories(prev => prev.filter(c => c.id !== deleteConfirm.id));
    setBudgets(prev => { const next = { ...prev }; delete next[deleteConfirm.id]; return next; });
    setDeleteConfirm(null);
  };

  return (
    <Page>
      <PageHeader>
        <PageTitle>קטגוריות</PageTitle>
        <AddFab onClick={openAdd}>+</AddFab>
      </PageHeader>

      <TabRow>
        <TabBtn $active={tab === "expense"} onClick={() => setTab("expense")}>הוצאות 📉</TabBtn>
        <TabBtn $active={tab === "income"} onClick={() => setTab("income")}>הכנסות 📈</TabBtn>
      </TabRow>

      {tab === "expense" && displayed.length > 0 && (
        <BudgetSummaryBar>
          <BudgetSummaryLabel>סה״כ תקציב חודשי</BudgetSummaryLabel>
          <BudgetSummaryVal>
            {formatCurrency(displayed.reduce((s, c) => s + (budgets[c.id] ?? 0), 0))}
          </BudgetSummaryVal>
        </BudgetSummaryBar>
      )}

      <ListWrapper>
        {displayed.length === 0 && (
          <EmptyState>
            <span style={{ fontSize: 48, marginBottom: 8 }}>🏷️</span>
            <span style={{ color: "#4a5568" }}>אין קטגוריות עדיין</span>
            <AddFirstBtn onClick={openAdd}>+ הוסף קטגוריה</AddFirstBtn>
          </EmptyState>
        )}
        {displayed.map(cat => {
          const spent = getSpent(cat.id);
          const limit = budgets[cat.id];
          const pct = limit ? Math.min(100, (spent / limit) * 100) : 0;
          const status = limit ? (pct >= 100 ? "over" : pct >= 80 ? "warn" : "ok") : null;

          return (
            <CatCard key={cat.id}>
              <CatMain>
                <CatEmoji>{cat.emoji}</CatEmoji>
                <CatDetails>
                  <CatName>{cat.label}</CatName>
                  {tab === "expense" && (
                    <CatMeta>
                      {spent > 0 ? (
                        <span style={{ color: status === "over" ? "#f472b6" : status === "warn" ? "#fbbf24" : "#a5b4fc" }}>
                          {formatCurrency(spent)} {limit ? `/ ${formatCurrency(limit)}` : ""}
                        </span>
                      ) : (
                        <span style={{ color: "#4a5568" }}>אין הוצאות החודש</span>
                      )}
                    </CatMeta>
                  )}
                  {limit && tab === "expense" && (
                    <MiniBar>
                      <MiniBarFill style={{ width: `${pct}%` }} $status={status} />
                    </MiniBar>
                  )}
                </CatDetails>
                <CatActions>
                  <EditBtn onClick={() => openEdit(cat)}>✏️</EditBtn>
                  <DeleteBtn onClick={() => setDeleteConfirm(cat)}>🗑️</DeleteBtn>
                </CatActions>
              </CatMain>
            </CatCard>
          );
        })}
      </ListWrapper>

      {showModal && (
        <ModalOverlay onClick={() => setShowModal(false)}>
          <ModalSheet onClick={e => e.stopPropagation()}>
            <ModalHeader>
              <span>{editingCat ? "עריכת קטגוריה" : "קטגוריה חדשה"}</span>
              <CloseBtn onClick={() => setShowModal(false)}>✕</CloseBtn>
            </ModalHeader>
            <ModalBody>
              <FieldGroup>
                <FieldLabel>סוג</FieldLabel>
                <TypeRow>
                  {[
                    { val: "expense", label: "הוצאה 📉" },
                    { val: "income",  label: "הכנסה 📈" },
                  ].map(t => (
                    <TypePill
                      key={t.val}
                      $active={draft.type === t.val}
                      $type={t.val}
                      onClick={() => setDraft(d => ({ ...d, type: t.val }))}
                    >
                      {t.label}
                    </TypePill>
                  ))}
                </TypeRow>
              </FieldGroup>

              <FieldGroup>
                <FieldLabel>אמוג׳י</FieldLabel>
                <EmojiGrid>
                  {EMOJI_LIST.map(em => (
                    <EmojiBtn
                      key={em}
                      $active={draft.emoji === em}
                      onClick={() => setDraft(d => ({ ...d, emoji: em }))}
                    >
                      {em}
                    </EmojiBtn>
                  ))}
                </EmojiGrid>
              </FieldGroup>

              <FieldGroup>
                <FieldLabel>שם קטגוריה</FieldLabel>
                <ModalInput
                  placeholder="לדוגמה: חינוך..."
                  value={draft.name}
                  onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                />
              </FieldGroup>

              {draft.type === "expense" && (
                <FieldGroup>
                  <FieldLabel>גבול תקציב חודשי (₪)</FieldLabel>
                  <ModalInput
                    type="number"
                    placeholder="ללא גבול"
                    value={draft.budget ?? ""}
                    onChange={e => setDraft(d => ({ ...d, budget: e.target.value }))}
                    style={{ direction: "ltr", textAlign: "right" }}
                  />
                </FieldGroup>
              )}
            </ModalBody>
            <ModalFooter>
              <SaveBtn onClick={saveCategory} disabled={!draft.name.trim()}>
                {editingCat ? "שמור שינויים ✓" : "הוסף קטגוריה ✓"}
              </SaveBtn>
            </ModalFooter>
          </ModalSheet>
        </ModalOverlay>
      )}

      {deleteConfirm && (
        <ModalOverlay onClick={() => setDeleteConfirm(null)}>
          <ConfirmSheet onClick={e => e.stopPropagation()}>
            <ConfirmEmoji>{deleteConfirm.emoji}</ConfirmEmoji>
            <ConfirmTitle>למחוק את "{deleteConfirm.label}"?</ConfirmTitle>
            <ConfirmSub>פעולה זו לא ניתנת לביטול</ConfirmSub>
            <ConfirmActions>
              <CancelBtn onClick={() => setDeleteConfirm(null)}>ביטול</CancelBtn>
              <DeleteConfirmBtn onClick={confirmDelete}>מחק</DeleteConfirmBtn>
            </ConfirmActions>
          </ConfirmSheet>
        </ModalOverlay>
      )}
    </Page>
  );
}

export default Categories;

const Page = styled.div`
  padding: 16px 16px 24px;
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const PageTitle = styled.div`
  font-size: 22px;
  font-weight: 800;
  color: #f0f4ff;
  letter-spacing: -0.5px;
`;

const AddFab = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  font-size: 24px;
  font-weight: 300;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(99,102,241,0.4);
  line-height: 1;
  padding-bottom: 1px;

  &:active { transform: scale(0.9); }
`;

const TabRow = styled.div`
  display: flex;
  background: #161b27;
  border-radius: 14px;
  padding: 4px;
  margin-bottom: 16px;
  border: 1px solid rgba(255,255,255,0.04);
`;

const TabBtn = styled.button`
  flex: 1;
  padding: 9px 0;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.18s;
  background: ${({ $active }) => $active ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "transparent"};
  color: ${({ $active }) => $active ? "white" : "#4a5568"};
  box-shadow: ${({ $active }) => $active ? "0 4px 12px rgba(0,0,0,0.3)" : "none"};
`;

const ListWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 0;
  gap: 8px;
`;

const AddFirstBtn = styled.button`
  margin-top: 12px;
  padding: 10px 20px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
`;

const CatCard = styled.div`
  background: #161b27;
  border-radius: 16px;
  padding: 14px;
  border: 1px solid rgba(255,255,255,0.04);
`;

const CatMain = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const CatEmoji = styled.div`
  font-size: 28px;
  flex-shrink: 0;
`;

const CatDetails = styled.div`
  flex: 1;
  min-width: 0;
`;

const CatName = styled.div`
  font-weight: 600;
  font-size: 15px;
  color: #f0f4ff;
`;

const CatMeta = styled.div`
  font-size: 12px;
  margin-top: 2px;
`;

const MiniBar = styled.div`
  height: 4px;
  background: #0d1117;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 6px;
`;

const MiniBarFill = styled.div`
  height: 100%;
  background: ${({ $status }) =>
    $status === "over" ? "linear-gradient(90deg,#f472b6,#e11d48)" :
    $status === "warn" ? "linear-gradient(90deg,#fbbf24,#f59e0b)" :
    "linear-gradient(90deg,#6366f1,#8b5cf6)"};
  border-radius: 4px;
  transition: width 0.4s ease;
`;

const CatActions = styled.div`
  display: flex;
  gap: 6px;
  flex-shrink: 0;
`;

const EditBtn = styled.button`
  background: rgba(255,255,255,0.06);
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const DeleteBtn = styled.button`
  background: rgba(244,114,182,0.1);
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.75);
  z-index: 500;
  display: flex;
  align-items: flex-end;
`;

const ModalSheet = styled.div`
  background: #161b27;
  border-radius: 24px 24px 0 0;
  width: 100%;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  border-top: 1px solid rgba(99,102,241,0.2);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 20px 12px;
  font-weight: 700;
  font-size: 17px;
  color: #f0f4ff;
  border-bottom: 1px solid rgba(255,255,255,0.06);
`;

const CloseBtn = styled.button`
  background: rgba(255,255,255,0.08);
  border: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 13px;
  color: #8b9dc3;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
`;

const ModalBody = styled.div`
  overflow-y: auto;
  padding: 16px 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FieldGroup = styled.div``;

const FieldLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: #8b9dc3;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  margin-bottom: 8px;
`;

const TypeRow = styled.div`
  display: flex;
  gap: 8px;
`;

const TypePill = styled.button`
  flex: 1;
  padding: 10px 0;
  border: 2px solid ${({ $active }) => $active ? "#6366f1" : "rgba(255,255,255,0.06)"};
  border-radius: 12px;
  background: ${({ $active }) => $active ? "rgba(99,102,241,0.15)" : "#1e2535"};
  color: ${({ $active }) => $active ? "#a5b4fc" : "#4a5568"};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
`;

const EmojiGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const EmojiBtn = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 2px solid ${({ $active }) => $active ? "#6366f1" : "rgba(255,255,255,0.06)"};
  background: ${({ $active }) => $active ? "rgba(99,102,241,0.2)" : "#1e2535"};
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.12s;

  &:active { transform: scale(0.9); }
`;

const ModalInput = styled.input`
  width: 100%;
  padding: 12px 14px;
  border: 2px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  background: #1e2535;
  color: #f0f4ff;
  font-size: 15px;
  font-family: inherit;
  outline: none;
  text-align: right;

  &::placeholder { color: #2d3748; }
  &:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
`;

const ModalFooter = styled.div`
  padding: 14px 20px calc(14px + env(safe-area-inset-bottom));
  border-top: 1px solid rgba(255,255,255,0.06);
`;

const SaveBtn = styled.button`
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  box-shadow: 0 4px 16px rgba(99,102,241,0.35);
  opacity: ${({ disabled }) => disabled ? 0.5 : 1};
`;

const ConfirmSheet = styled.div`
  background: #161b27;
  border-radius: 24px 24px 0 0;
  width: 100%;
  padding: 28px 24px calc(28px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  border-top: 1px solid rgba(244,114,182,0.2);
`;

const ConfirmEmoji = styled.div`
  font-size: 48px;
  margin-bottom: 12px;
`;

const ConfirmTitle = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: #f0f4ff;
  margin-bottom: 6px;
`;

const ConfirmSub = styled.div`
  font-size: 13px;
  color: #8b9dc3;
  margin-bottom: 24px;
`;

const ConfirmActions = styled.div`
  display: flex;
  gap: 12px;
  width: 100%;
`;

const CancelBtn = styled.button`
  flex: 1;
  padding: 13px;
  border: 2px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  background: transparent;
  color: #8b9dc3;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
`;

const DeleteConfirmBtn = styled.button`
  flex: 1;
  padding: 13px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #f472b6, #e11d48);
  color: white;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  box-shadow: 0 4px 16px rgba(244,114,182,0.3);
`;

const BudgetSummaryBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(99,102,241,0.1);
  border: 1px solid rgba(99,102,241,0.2);
  border-radius: 14px;
  padding: 12px 16px;
  margin-bottom: 14px;
`;

const BudgetSummaryLabel = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #8b9dc3;
`;

const BudgetSummaryVal = styled.div`
  font-size: 20px;
  font-weight: 800;
  color: #a5b4fc;
`;

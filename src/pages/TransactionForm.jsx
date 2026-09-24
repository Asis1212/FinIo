import { useState } from "react";
import styled from "styled-components";

const PAYMENT_METHODS = [
  { val: "credit",   label: "אשראי",   emoji: "💳" },
  { val: "bit",      label: "ביט",     emoji: "📱" },
  { val: "cash",     label: "מזומן",   emoji: "💵" },
  { val: "transfer", label: "העברה",   emoji: "🏦" },
  { val: "paybox",   label: "פייבוקס", emoji: "📲" },
  { val: "check",    label: "צ׳ק",     emoji: "📝" },
];

function TransactionForm({ setActivityPage, toast, setToast, addTransaction, editTx, replaceTransaction, removeTransaction, categories, profile, recurringLocked }) {
  const isEdit = !!editTx;

  const expenseCategories = categories?.filter(c => c.type === "expense") ?? [];
  const incomeCategories  = categories?.filter(c => c.type === "income")  ?? [];

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(
    isEdit
      ? { type: editTx.type, date: editTx.date, amount: editTx.amount, category: editTx.category, person: editTx.person ?? null, description: editTx.description || "", paymentMethod: editTx.paymentMethod || "", recurring: !!editTx.recurring, installments: false, installmentCount: 2, installmentIndex: editTx.installmentIndex ?? null, installmentTotal: editTx.installmentTotal ?? null }
      : { type: "expense", date: new Date().toISOString().slice(0, 10), recurring: recurringLocked ? true : false, person: null, paymentMethod: "", description: "", installments: false, installmentCount: 2 }
  );

  const currentCats = formData.type === "expense" ? expenseCategories : incomeCategories;
  const p1Name = profile?.personOneName ?? "אלעד";
  const p2Name = profile?.personTwoName ?? "נויה";
  const backPage = recurringLocked ? "recurring" : (isEdit ? "history" : "dashboard");
  const totalSteps = 3;

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const handleNext = () => {
    if (step === 1 && (!formData.amount || parseFloat(formData.amount) <= 0)) {
      showToast("הכנס סכום תקין", "error");
      return;
    }
    setStep(s => s + 1);
  };

  const handleBack = () => {
    if (step === 1) setActivityPage(backPage);
    else setStep(s => s - 1);
  };

  const handleSave = () => {
    if (isEdit) {
      replaceTransaction({ ...editTx, ...formData });
      showToast("✓ עודכן בהצלחה!");
      setActivityPage(recurringLocked ? "recurring" : "history");
    } else if (!recurringLocked && formData.installments && formData.installmentCount >= 2) {
      const count = parseInt(formData.installmentCount, 10);
      const perPayment = Math.round((parseFloat(formData.amount) / count) * 100) / 100;
      const groupId = crypto.randomUUID();
      const [year, month, day] = formData.date.split("-").map(Number);
      for (let i = 0; i < count; i++) {
        const m = ((month - 1 + i) % 12) + 1;
        const y = year + Math.floor((month - 1 + i) / 12);
        const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        addTransaction({
          id: crypto.randomUUID(),
          ...formData,
          amount: perPayment,
          date: dateStr,
          installmentId:    groupId,
          installmentIndex: i + 1,
          installmentTotal: count,
          installments:     undefined,
          installmentCount: undefined,
        });
      }
      showToast(`✓ נוצרו ${count} תשלומים!`);
      setActivityPage("dashboard");
    } else {
      addTransaction({ id: crypto.randomUUID(), ...formData });
      showToast("✓ נוסף בהצלחה!");
      if (recurringLocked || formData.recurring) {
        setActivityPage("recurring");
      } else {
        setActivityPage("dashboard");
      }
    }
  };

  const pageTitle = isEdit ? "עריכת עסקה" : recurringLocked ? "הוראת קבע חדשה" : "עסקה חדשה";

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader>
        <BackBtn onClick={handleBack}>{step === 1 ? "✕" : "‹"}</BackBtn>
        <PageTitle>{pageTitle}</PageTitle>
        {isEdit && removeTransaction
          ? <DeleteTxBtn onClick={() => removeTransaction(editTx.id)}>מחק</DeleteTxBtn>
          : <StepLabel>{step} / {totalSteps}</StepLabel>
        }
      </PageHeader>

      {/* Progress bar */}
      <ProgressTrack>
        <ProgressFill style={{ width: `${(step / totalSteps) * 100}%` }} $type={formData.type} />
      </ProgressTrack>

      {/* Step 1 — type + amount */}
      {step === 1 && (
        <Card>
          <TypeToggle>
            {[
              { val: "expense", label: "הוצאה", icon: "📉" },
              { val: "income",  label: "הכנסה", icon: "📈" },
            ].map(t => (
              <TypeBtn
                key={t.val}
                $active={formData.type === t.val}
                $type={t.val}
                onClick={() => setFormData(f => ({ ...f, type: t.val, category: "" }))}
              >
                {t.icon} {t.label}
              </TypeBtn>
            ))}
          </TypeToggle>

          <AmountSection>
            <AmountPrefix>₪</AmountPrefix>
            <AmountInput
              type="number"
              placeholder="0"
              autoFocus
              value={formData.amount ?? ""}
              onChange={e => setFormData(f => ({ ...f, amount: e.target.value }))}
            />
          </AmountSection>

          <NextBtn $type={formData.type} onClick={handleNext}>הבא ›</NextBtn>
        </Card>
      )}

      {/* Step 2 — category + description */}
      {step === 2 && (
        <Card>
          <SectionLabel>קטגוריה</SectionLabel>
          <CategoryGrid>
            {currentCats.map(cat => (
              <CatBtn
                key={cat.id}
                $active={formData.category === cat.id}
                onClick={() => setFormData(f => ({ ...f, category: cat.id }))}
              >
                <span style={{ fontSize: 20 }}>{cat.emoji}</span>
                <CatLabel>{cat.label}</CatLabel>
              </CatBtn>
            ))}
          </CategoryGrid>

          <SectionLabel style={{ marginTop: 20 }}>תיאור (אופציונלי)</SectionLabel>
          <DescInput
            type="text"
            placeholder="לדוגמה: סופר אלפא..."
            value={formData.description ?? ""}
            onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
          />

          <NextBtn $type={formData.type} onClick={handleNext}>הבא ›</NextBtn>
        </Card>
      )}

      {/* Step 3 — person + date + payment + recurring + save */}
      {step === 3 && (
        <Card>
          <SectionLabel>של מי?</SectionLabel>
          <PersonRow>
            {[
              { val: "personOne", label: p1Name, emoji: "🙋🏽" },
              { val: "personTwo", label: p2Name, emoji: "🙋🏽‍♀️" },
            ].map(p => (
              <PersonBtn
                key={p.val}
                $active={formData.person === p.val || formData.person === "both"}
                onClick={() => setFormData(f => {
                  if (f.person === "both") return { ...f, person: p.val === "personOne" ? "personTwo" : "personOne" };
                  if (f.person === p.val) return { ...f, person: null };
                  if (f.person && f.person !== p.val) return { ...f, person: "both" };
                  return { ...f, person: p.val };
                })}
              >
                <span style={{ fontSize: 22 }}>{p.emoji}</span>
                <span>{p.label}</span>
              </PersonBtn>
            ))}
          </PersonRow>

          {!recurringLocked && (
            <SectionLabel style={{ marginTop: 20 }}>תאריך</SectionLabel>
          )}
          {!recurringLocked && (
            <DateInput
              type="date"
              value={formData.date}
              onChange={e => setFormData(f => ({ ...f, date: e.target.value }))}
            />
          )}

          <SectionLabel style={{ marginTop: 20 }}>אמצעי תשלום</SectionLabel>
          <PaymentGrid>
            {PAYMENT_METHODS.map(pm => (
              <PayBtn
                key={pm.val}
                $active={formData.paymentMethod === pm.val}
                onClick={() => setFormData(f => ({ ...f, paymentMethod: f.paymentMethod === pm.val ? "" : pm.val }))}
              >
                <span>{pm.emoji}</span>
                <span>{pm.label}</span>
              </PayBtn>
            ))}
          </PaymentGrid>

          {!recurringLocked && !isEdit && (
            <RecurringRow
              $on={!!formData.installments}
              onClick={() => setFormData(f => ({ ...f, installments: !f.installments, recurring: false }))}
            >
              <RecurringLeft>
                <span style={{ fontSize: 20 }}>💳</span>
                <div>
                  <RecurringTitle>תשלומים</RecurringTitle>
                  <RecurringSub>פיצול לחודשים קדימה</RecurringSub>
                </div>
              </RecurringLeft>
              <Toggle $on={!!formData.installments}>
                <ToggleThumb $on={!!formData.installments} />
              </Toggle>
            </RecurringRow>
          )}

          {!recurringLocked && !isEdit && formData.installments && (
            <>
              <SectionLabel style={{ marginTop: 16 }}>מספר תשלומים</SectionLabel>
              <InstallmentRow>
                <InstallmentBtn
                  onClick={() => setFormData(f => ({ ...f, installmentCount: Math.max(2, (f.installmentCount || 2) - 1) }))}
                >−</InstallmentBtn>
                <InstallmentCount>{formData.installmentCount || 2}</InstallmentCount>
                <InstallmentBtn
                  onClick={() => setFormData(f => ({ ...f, installmentCount: Math.min(36, (f.installmentCount || 2) + 1) }))}
                >+</InstallmentBtn>
              </InstallmentRow>
              {formData.amount && parseFloat(formData.amount) > 0 && (
                <InstallmentNote>
                  {Math.round((parseFloat(formData.amount) / (formData.installmentCount || 2)) * 100) / 100} ₪ לתשלום
                </InstallmentNote>
              )}
            </>
          )}

          {isEdit && editTx?.installmentTotal && (
            <>
              <SectionLabel style={{ marginTop: 16 }}>תשלום מספר</SectionLabel>
              <InstallmentRow>
                <InstallmentBtn
                  onClick={() => setFormData(f => ({ ...f, installmentIndex: Math.max(1, (f.installmentIndex || 1) - 1) }))}
                >−</InstallmentBtn>
                <InstallmentCount>{formData.installmentIndex || editTx.installmentIndex} / {editTx.installmentTotal}</InstallmentCount>
                <InstallmentBtn
                  onClick={() => setFormData(f => ({ ...f, installmentIndex: Math.min(editTx.installmentTotal, (f.installmentIndex || editTx.installmentIndex) + 1) }))}
                >+</InstallmentBtn>
              </InstallmentRow>
            </>
          )}

          <SaveBtn $type={formData.type} onClick={handleSave}>
            {isEdit ? "שמור שינויים ✓" : "הוסף עסקה ✓"}
          </SaveBtn>
        </Card>
      )}
    </PageContainer>
  );
}

export default TransactionForm;

const PageContainer = styled.div`
  padding: 16px 16px 24px;
  width: 100%;
  box-sizing: border-box;
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const BackBtn = styled.button`
  background: rgba(255,255,255,0.06);
  border: none;
  color: #8b9dc3;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
`;

const PageTitle = styled.div`
  font-size: 18px;
  font-weight: 800;
  color: #f0f4ff;
`;

const StepLabel = styled.div`
  font-size: 13px;
  color: #4a5568;
  font-weight: 600;
  width: 36px;
  text-align: center;
`;

const DeleteTxBtn = styled.button`
  background: none;
  border: none;
  color: #f472b6;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  padding: 4px 2px;
  width: 36px;
  text-align: center;
  &:active { opacity: 0.7; }
`;

const ProgressTrack = styled.div`
  height: 3px;
  background: rgba(255,255,255,0.06);
  border-radius: 2px;
  margin-bottom: 16px;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
  background: ${({ $type }) =>
    $type === "expense"
      ? "linear-gradient(90deg, #6366f1, #f472b6)"
      : "linear-gradient(90deg, #6366f1, #22d3a5)"};
`;

const Card = styled.div`
  background: #161b27;
  border-radius: 24px;
  padding: 20px 16px;
  border: 1px solid rgba(255,255,255,0.05);
  box-shadow: 0 4px 24px rgba(0,0,0,0.3);
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
`;

const TypeToggle = styled.div`
  display: flex;
  background: #0d1117;
  border-radius: 14px;
  padding: 4px;
  margin-bottom: 20px;
  gap: 4px;
`;

const TypeBtn = styled.button`
  flex: 1;
  padding: 10px 0;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
  background: ${({ $active, $type }) =>
    $active
      ? $type === "expense"
        ? "linear-gradient(135deg, #f472b6, #e11d48)"
        : "linear-gradient(135deg, #22d3a5, #059669)"
      : "rgba(255,255,255,0.05)"};
  color: ${({ $active }) => $active ? "white" : "#8b9dc3"};
  box-shadow: ${({ $active }) => $active ? "0 4px 14px rgba(0,0,0,0.3)" : "none"};
`;

const AmountSection = styled.div`
  display: flex;
  align-items: center;
  background: #0d1117;
  border-radius: 16px;
  padding: 0 16px;
  margin-bottom: 24px;
  border: 2px solid rgba(255,255,255,0.08);
  direction: ltr;
`;

const AmountPrefix = styled.div`
  font-size: 28px;
  font-weight: 700;
  color: #8b9dc3;
  margin-right: 8px;
`;

const AmountInput = styled.input`
  flex: 1;
  padding: 20px 0;
  border: none;
  background: transparent;
  font-size: 42px;
  font-weight: 900;
  color: #f0f4ff;
  text-align: left;
  outline: none;
  font-family: inherit;
  letter-spacing: -1px;
  min-width: 0;

  &::placeholder { color: #2d3748; }
`;

const SectionLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #8b9dc3;
  margin-bottom: 10px;
  letter-spacing: 0.3px;
`;

const CategoryGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;

const CatBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 2px solid ${({ $active }) => $active ? "#6366f1" : "rgba(255,255,255,0.06)"};
  border-radius: 12px;
  background: ${({ $active }) => $active ? "rgba(99,102,241,0.15)" : "#1e2535"};
  cursor: pointer;
  font-family: inherit;
  text-align: right;
  transition: all 0.15s;
`;

const CatLabel = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: #c7d2e8;
  flex: 1;
  text-align: right;
`;

const DescInput = styled.input`
  width: 100%;
  background: #1e2535;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  padding: 12px 14px;
  color: #f0f4ff;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;

  &::placeholder { color: #4a5568; }
  &:focus { border-color: rgba(99,102,241,0.4); }
`;

const PersonRow = styled.div`
  display: flex;
  gap: 10px;
`;

const PersonBtn = styled.button`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 6px;
  border: 2px solid ${({ $active }) => $active ? "#6366f1" : "rgba(255,255,255,0.06)"};
  border-radius: 14px;
  background: ${({ $active }) => $active ? "rgba(99,102,241,0.15)" : "#1e2535"};
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: ${({ $active }) => $active ? 700 : 400};
  color: ${({ $active }) => $active ? "#a5b4fc" : "#8b9dc3"};
  transition: all 0.15s;
`;

const DateInput = styled.input`
  width: 100%;
  max-width: 100%;
  background: #1e2535;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  padding: 12px 14px;
  color: #f0f4ff;
  font-size: 16px;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
  display: block;
  -webkit-appearance: none;
  appearance: none;

  &:focus { border-color: rgba(99,102,241,0.4); }
`;

const PaymentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
`;

const PayBtn = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px;
  border: 2px solid ${({ $active }) => $active ? "#6366f1" : "rgba(255,255,255,0.06)"};
  border-radius: 12px;
  background: ${({ $active }) => $active ? "rgba(99,102,241,0.15)" : "#1e2535"};
  cursor: pointer;
  font-family: inherit;
  font-size: 11px;
  font-weight: ${({ $active }) => $active ? 700 : 400};
  color: ${({ $active }) => $active ? "#a5b4fc" : "#8b9dc3"};
  transition: all 0.15s;
`;

const NextBtn = styled.button`
  width: 100%;
  padding: 15px;
  border: none;
  border-radius: 14px;
  background: ${({ $type }) =>
    $type === "expense"
      ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
      : "linear-gradient(135deg, #22d3a5, #059669)"};
  color: white;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  margin-top: 20px;
  box-shadow: 0 6px 24px rgba(99,102,241,0.3);
  transition: transform 0.15s;

  &:active { transform: scale(0.98); }
`;

const SaveBtn = styled(NextBtn)``;

const RecurringRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border: 2px solid ${({ $on }) => $on ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.06)"};
  border-radius: 14px;
  background: ${({ $on }) => $on ? "rgba(99,102,241,0.08)" : "#1e2535"};
  cursor: pointer;
  margin-top: 16px;
  user-select: none;
  transition: all 0.15s;
`;

const RecurringLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const RecurringTitle = styled.div`
  font-weight: 600;
  font-size: 13px;
  color: #f0f4ff;
`;

const RecurringSub = styled.div`
  font-size: 11px;
  color: #8b9dc3;
  margin-top: 1px;
`;

const Toggle = styled.div`
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: ${({ $on }) => $on ? "#6366f1" : "#2d3748"};
  position: relative;
  transition: background 0.2s;
  flex-shrink: 0;
`;

const ToggleThumb = styled.div`
  position: absolute;
  top: 3px;
  left: ${({ $on }) => $on ? "23px" : "3px"};
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 1px 4px rgba(0,0,0,0.3);
  transition: left 0.2s;
`;

const InstallmentRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 8px;
`;

const InstallmentBtn = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.08);
  background: #1e2535;
  color: #f0f4ff;
  font-size: 22px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  &:active { background: rgba(99,102,241,0.2); }
`;

const InstallmentCount = styled.div`
  font-size: 28px;
  font-weight: 900;
  color: #a5b4fc;
  min-width: 64px;
  text-align: center;
  letter-spacing: -1px;
`;

const InstallmentNote = styled.div`
  text-align: center;
  font-size: 13px;
  color: #8b9dc3;
  margin-top: 4px;
`;

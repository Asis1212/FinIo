import { useState, useMemo } from "react";
import styled from "styled-components";
import { isInCycle, buildCycleList } from "../utils/monthUtils";

const DEFAULT_BUDGET = 1000; // ₪ per category default

// Draws a small SVG donut showing pct utilization (0-100+)
function MiniDonut({ pct, color, size = 36 }) {
  const R = 13;
  const CX = size / 2;
  const CY = size / 2;
  const circumference = 2 * Math.PI * R;
  const clamped = Math.min(pct, 100);
  const dash = (clamped / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
      <circle
        cx={CX} cy={CY} r={R}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeDasharray={`${dash} ${circumference}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${CX} ${CY})`}
        style={{ transition: "stroke-dasharray 0.5s ease" }}
      />
    </svg>
  );
}

const CAT_COLORS = [
  "#6366f1","#f472b6","#22d3a5","#fbbf24","#38bdf8","#a78bfa",
  "#fb7185","#34d399","#f97316","#60a5fa","#e879f9","#4ade80",
  "#facc15","#818cf8","#2dd4bf","#fb923c",
];

function Dashboard({ transactions, allTransactions, setActivityPage, budgets, setBudgets, selectedMonth, setSelectedMonth, cycleDay = 1, categories, profile }) {
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState({});

  const expenseCategories = categories?.filter(c => c.type === "expense") ?? [];
  const incomeCategories  = categories?.filter(c => c.type === "income")  ?? [];

  const getCatInfo = (type, categoryId) => {
    const list = type === "income" ? incomeCategories : expenseCategories;
    return list.find((c) => c.id === categoryId) ?? { emoji: "📦", label: categoryId };
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(amount);

  // Month-filtered transactions (all people)
  const monthTx = useMemo(() =>
    selectedMonth
      ? transactions.filter(tx => isInCycle(tx.date, selectedMonth, cycleDay))
      : transactions,
    [transactions, selectedMonth, cycleDay]
  );

  // Per-category spent this month
  const catData = useMemo(() =>
    expenseCategories.map((cat, i) => {
      const spent = monthTx
        .filter(tx => tx.type === "expense" && tx.category === cat.id)
        .reduce((s, tx) => s + Number(tx.amount), 0);
      const limit  = budgets[cat.id] ?? DEFAULT_BUDGET;
      const pct    = limit > 0 ? (spent / limit) * 100 : 0;
      const status = pct >= 100 ? "over" : pct >= 80 ? "warn" : "ok";
      const color  = CAT_COLORS[i % CAT_COLORS.length];
      return { ...cat, spent, limit, pct, status, color };
    }),
    [expenseCategories, monthTx, budgets]
  );

  const activeCats = catData.filter(c => c.spent > 0);

  // 5 most recent expense transactions this month
  const recentExpenses = useMemo(() =>
    monthTx
      .filter(tx => tx.type === "expense")
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5),
    [monthTx]
  );

  const p1Name = profile?.personOneName ?? "אלעד";
  const p2Name = profile?.personTwoName ?? "נויה";

  // Month navigation
  const monthsList = useMemo(() => buildCycleList(12, cycleDay), [cycleDay]);

  const currentIdx = monthsList.indexOf(selectedMonth);
  const canGoBack    = currentIdx < monthsList.length - 1;
  const canGoForward = currentIdx > 0;

  const goBack    = () => canGoBack    && setSelectedMonth(monthsList[currentIdx + 1]);
  const goForward = () => canGoForward && setSelectedMonth(monthsList[currentIdx - 1]);

  const openBudgetModal = () => {
    setBudgetDraft(
      Object.fromEntries(expenseCategories.map(c => [c.id, budgets[c.id] ?? DEFAULT_BUDGET]))
    );
    setShowBudgetModal(true);
  };

  const saveBudgets = () => {
    const cleaned = {};
    for (const [k, v] of Object.entries(budgetDraft)) {
      const n = parseFloat(v);
      if (n > 0) cleaned[k] = n;
    }
    setBudgets(cleaned);
    setShowBudgetModal(false);
  };

  return (
    <Page>

      {/* Month switcher */}
      <MonthSwitcher>
        <MonthArrow onClick={goBack} $disabled={!canGoBack}>‹</MonthArrow>
        <MonthLabel>{selectedMonth}</MonthLabel>
        <MonthArrow onClick={goForward} $disabled={!canGoForward}>›</MonthArrow>
      </MonthSwitcher>


      {/* Category donuts grid */}
      {activeCats.length > 0 ? (
        <Section>
          <SectionHeader>
            <SectionTitle>ניצול תקציב — {selectedMonth}</SectionTitle>
            <ActionBtn onClick={openBudgetModal}>⚙️ תקציב</ActionBtn>
          </SectionHeader>
          <DonutGrid>
            {activeCats.map(cat => (
              <DonutCard key={cat.id} $status={cat.status}>
                <DonutWrapper>
                  <MiniDonut
                    pct={cat.pct}
                    size={36}
                    color={
                      cat.status === "over" ? "#f472b6" :
                      cat.status === "warn" ? "#fbbf24" :
                      cat.color
                    }
                  />
                  <DonutInner>
                    <DonutEmoji>{cat.emoji}</DonutEmoji>
                  </DonutInner>
                </DonutWrapper>
                <DonutLabel>{cat.label}</DonutLabel>
                <DonutAmountRow>
                  <DonutSpent $status={cat.status}>{formatCurrency(cat.spent)}</DonutSpent>
                  <DonutLimit>/ {formatCurrency(cat.limit)}</DonutLimit>
                </DonutAmountRow>
                <DonutPct $status={cat.status}>
                  {Math.round(cat.pct)}%{cat.status === "over" ? "⚠️" : ""}
                </DonutPct>
              </DonutCard>
            ))}
          </DonutGrid>
        </Section>
      ) : (
        <Section>
          <SectionHeader>
            <SectionTitle>ניצול תקציב — {selectedMonth}</SectionTitle>
            <ActionBtn onClick={openBudgetModal}>⚙️ תקציב</ActionBtn>
          </SectionHeader>
          <EmptyState>
            <span style={{ fontSize: 44, marginBottom: 8 }}>📊</span>
            <span style={{ color: "#4a5568", fontSize: 14 }}>אין הוצאות החודש עדיין</span>
          </EmptyState>
        </Section>
      )}

      {/* Recent expenses — pop card */}
      <RecentSection>
        <RecentHeader>
          <RecentTitle>הוצאות אחרונות</RecentTitle>
          {recentExpenses.length > 0 && (
            <RecentAllBtn onClick={() => setActivityPage("history")}>הכל →</RecentAllBtn>
          )}
        </RecentHeader>

        {recentExpenses.length === 0 ? (
          <EmptyState>
            <span style={{ fontSize: 44, marginBottom: 8 }}>📭</span>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>אין הוצאות החודש</span>
          </EmptyState>
        ) : (
          recentExpenses.map((tx, idx) => {
            const cat = getCatInfo(tx.type, tx.category);
            const catIdx = expenseCategories.findIndex(c => c.id === tx.category);
            const dotColor = catIdx >= 0 ? CAT_COLORS[catIdx % CAT_COLORS.length] : "#6366f1";
            return (
              <RecentRow key={tx.id} $last={idx === recentExpenses.length - 1}>
                <RecentIcon style={{ background: `${dotColor}22` }}>
                  <span style={{ fontSize: 20 }}>{cat.emoji}</span>
                </RecentIcon>
                <RecentInfo>
                  <RecentTxTitle>
                    {cat.label}
                    {tx.recurring && <span style={{ marginInlineStart: 6, fontSize: 11, opacity: 0.7 }}>🔄</span>}
                  </RecentTxTitle>
                  <RecentMeta>
                    {tx.date.split("-").reverse().join("/")}
                    {tx.description ? ` · ${tx.description}` : ""}
                    {" · "}{tx.person === "both" ? `${p1Name} · ${p2Name}` : tx.person === "personOne" ? p1Name : p2Name}
                  </RecentMeta>
                </RecentInfo>
                <RecentAmount>−{formatCurrency(tx.amount)}</RecentAmount>
              </RecentRow>
            );
          })
        )}
      </RecentSection>

      {/* Budget modal */}
      {showBudgetModal && (
        <ModalOverlay onClick={() => setShowBudgetModal(false)}>
          <ModalSheet onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <span>הגדרת תקציב לקטגוריות</span>
              <CloseBtn onClick={() => setShowBudgetModal(false)}>✕</CloseBtn>
            </ModalHeader>
            <ModalBody>
              {expenseCategories.map((cat) => (
                <BudgetRow key={cat.id}>
                  <BudgetLabel>{cat.emoji} {cat.label}</BudgetLabel>
                  <BudgetInput
                    type="number"
                    placeholder={`${DEFAULT_BUDGET}`}
                    value={budgetDraft[cat.id] ?? ""}
                    onChange={(e) => setBudgetDraft((d) => ({ ...d, [cat.id]: e.target.value }))}
                  />
                </BudgetRow>
              ))}
            </ModalBody>
            <ModalFooter>
              <BudgetTotal>
                סה״כ תקציב חודשי:
                <BudgetTotalVal>
                  {formatCurrency(Object.values(budgetDraft).reduce((s, v) => s + (parseFloat(v) || 0), 0))}
                </BudgetTotalVal>
              </BudgetTotal>
              <SaveBtn onClick={saveBudgets}>שמור תקציב ✓</SaveBtn>
            </ModalFooter>
          </ModalSheet>
        </ModalOverlay>
      )}
    </Page>
  );
}

export default Dashboard;

// ── Month switcher ────────────────────────────────────────────────────────────

const MonthSwitcher = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  margin: 4px 16px 14px;
  background: #161b27;
  border-radius: 16px;
  border: 1px solid rgba(99,102,241,0.15);
  overflow: hidden;
`;

const MonthArrow = styled.button`
  width: 44px;
  height: 44px;
  border: none;
  background: transparent;
  color: ${({ $disabled }) => $disabled ? "#2d3748" : "#a5b4fc"};
  font-size: 24px;
  font-weight: 300;
  cursor: ${({ $disabled }) => $disabled ? "default" : "pointer"};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
  font-family: inherit;
  flex-shrink: 0;
  line-height: 1;

  &:active {
    background: ${({ $disabled }) => $disabled ? "transparent" : "rgba(99,102,241,0.12)"};
  }
`;

const MonthLabel = styled.div`
  flex: 1;
  text-align: center;
  font-size: 14px;
  font-weight: 700;
  color: #f0f4ff;
  letter-spacing: 0.2px;
`;

// ── Layout ────────────────────────────────────────────────────────────────────

const Page = styled.div`
  padding: 12px 0 24px;
`;

const Section = styled.div`
  margin: 0 16px 14px;
  background: #161b27;
  border-radius: 20px;
  padding: 16px;
  border: 1px solid rgba(255,255,255,0.04);
  box-shadow: 0 2px 20px rgba(0,0,0,0.25);
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const SectionTitle = styled.div`
  font-weight: 700;
  font-size: 15px;
  color: #f0f4ff;
`;

const ActionBtn = styled.button`
  background: rgba(99,102,241,0.14);
  border: none;
  color: #a5b4fc;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  padding: 5px 12px;
  border-radius: 10px;
  transition: background 0.15s;
  &:active { background: rgba(99,102,241,0.25); }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 0 12px;
`;

// ── Donut grid ────────────────────────────────────────────────────────────────

const DonutGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
`;

const DonutCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 8px 4px 6px;
  background: ${({ $status }) =>
    $status === "over" ? "rgba(244,114,182,0.06)" :
    $status === "warn" ? "rgba(251,191,36,0.06)" :
    "rgba(255,255,255,0.03)"};
  border-radius: 12px;
  border: 1px solid ${({ $status }) =>
    $status === "over" ? "rgba(244,114,182,0.18)" :
    $status === "warn" ? "rgba(251,191,36,0.18)" :
    "rgba(255,255,255,0.04)"};
`;

const DonutWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const DonutInner = styled.div`
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const DonutEmoji = styled.span`
  font-size: 12px;
`;

const DonutLabel = styled.div`
  font-size: 10px;
  font-weight: 600;
  color: #c7d2e8;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  padding: 0 2px;
`;

const DonutAmountRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 2px;
  justify-content: center;
`;

const DonutSpent = styled.span`
  font-size: 10px;
  font-weight: 700;
  color: ${({ $status }) =>
    $status === "over" ? "#f472b6" :
    $status === "warn" ? "#fbbf24" :
    "#a5b4fc"};
`;

const DonutLimit = styled.span`
  font-size: 9px;
  color: #4a5568;
`;

const DonutPct = styled.span`
  font-size: 10px;
  font-weight: 700;
  color: ${({ $status }) =>
    $status === "over" ? "#f472b6" :
    $status === "warn" ? "#fbbf24" :
    "#6b7aaa"};
`;

// ── Recent expenses pop section ───────────────────────────────────────────────

const RecentSection = styled.div`
  margin: 0 16px 14px;
  background: linear-gradient(145deg, #1e1535 0%, #1a1f35 100%);
  border-radius: 20px;
  padding: 18px 16px;
  border: 1px solid rgba(139,92,246,0.2);
  box-shadow: 0 4px 24px rgba(99,102,241,0.12), 0 2px 8px rgba(0,0,0,0.3);
`;

const RecentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
`;

const RecentTitle = styled.div`
  font-weight: 700;
  font-size: 15px;
  color: #e0d7ff;
`;

const RecentAllBtn = styled.button`
  background: rgba(139,92,246,0.18);
  border: none;
  color: #c4b5fd;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  padding: 5px 12px;
  border-radius: 10px;
  transition: background 0.15s;
  &:active { background: rgba(139,92,246,0.3); }
`;

const RecentRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: ${({ $last }) => $last ? "none" : "1px solid rgba(255,255,255,0.05)"};
`;

const RecentIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const RecentInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const RecentTxTitle = styled.div`
  font-weight: 600;
  font-size: 14px;
  color: #e8e0ff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const RecentMeta = styled.div`
  font-size: 11px;
  color: rgba(200,190,255,0.45);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const RecentAmount = styled.div`
  font-weight: 700;
  font-size: 14px;
  color: #f472b6;
  flex-shrink: 0;
`;

// ── Budget modal ──────────────────────────────────────────────────────────────

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
  max-height: 80vh;
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
  padding: 12px 20px;
  flex: 1;
`;

const BudgetRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  &:last-child { border-bottom: none; }
`;

const BudgetLabel = styled.div`
  font-size: 14px;
  color: #c7d2e8;
  flex: 1;
`;

const BudgetInput = styled.input`
  width: 100px;
  padding: 7px 10px;
  border: 2px solid rgba(99,102,241,0.2);
  border-radius: 10px;
  font-size: 14px;
  font-family: inherit;
  text-align: left;
  outline: none;
  color: #f0f4ff;
  background: #1e2535;
  direction: ltr;

  &:focus { border-color: #6366f1; }
`;

const ModalFooter = styled.div`
  padding: 14px 20px calc(14px + env(safe-area-inset-bottom));
  border-top: 1px solid rgba(255,255,255,0.06);
`;

const BudgetTotal = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0 14px;
  font-size: 14px;
  color: #8b9dc3;
  font-weight: 600;
`;

const BudgetTotalVal = styled.span`
  font-size: 18px;
  font-weight: 800;
  color: #a5b4fc;
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
`;

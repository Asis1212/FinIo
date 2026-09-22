import { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import { isInCycle } from "../utils/monthUtils";
import { exportHTMLReport } from "../utils/exportReport";

function SwipeableRow({ onDelete, children }) {
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startX = useRef(null);
  const THRESHOLD = 80;

  const onPointerDown = (e) => { startX.current = e.clientX; setSwiping(true); };
  const onPointerMove = (e) => {
    if (startX.current === null) return;
    const dx = startX.current - e.clientX;
    setOffset(Math.max(0, Math.min(dx, 120)));
  };
  const onPointerUp = () => {
    if (offset >= THRESHOLD) onDelete();
    else setOffset(0);
    startX.current = null;
    setSwiping(false);
  };

  return (
    <SwipeWrapper>
      <SwipeDeleteBg $visible={offset > 10}><span>🗑️</span></SwipeDeleteBg>
      <SwipeContent
        style={{ transform: `translateX(${offset}px)` }}
        $swiping={swiping}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {children}
      </SwipeContent>
    </SwipeWrapper>
  );
}

function History({ transactions, selectedMonth, cycleDay = 1, removeTransaction, restoreTransaction, setActivityPage, categories, profile }) {  const [active, setActive] = useState("both");
  const [typeTab, setTypeTab] = useState("all");
  const [undoItem, setUndoItem] = useState(null);
  const [undoTimer, setUndoTimer] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ search: "", dateFrom: "", dateTo: "", category: "", minAmount: "", maxAmount: "" });

  const allCategories = categories ?? [];
  const expenseCategories = allCategories.filter(c => c.type === "expense");
  const incomeCategories  = allCategories.filter(c => c.type === "income");

  const setFilter = (key, val) => setFilters((f) => ({ ...f, [key]: val }));
  const hasActiveFilters = Object.values(filters).some((v) => v !== "");
  const clearFilters = () => setFilters({ search: "", dateFrom: "", dateTo: "", category: "", minAmount: "", maxAmount: "" });

  const getCatInfo = (type, categoryId) => {
    const list = type === "income" ? incomeCategories : expenseCategories;
    return list.find((c) => c.id === categoryId) ?? { emoji: "📦", label: categoryId };
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(amount);

  const monthFiltered = selectedMonth
    ? transactions.filter((tx) => isInCycle(tx.date, selectedMonth, cycleDay))
    : transactions;

  const personFiltered =
    active === "both"
      ? monthFiltered
      : monthFiltered.filter((tx) => tx.person === active || tx.person === "both");

  const filteredTransactions = personFiltered.filter((tx) => {
    if (typeTab !== "all" && tx.type !== typeTab) return false;
    const cat = getCatInfo(tx.type, tx.category);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!cat.label.toLowerCase().includes(q) && !(tx.description ?? "").toLowerCase().includes(q)) return false;
    }
    if (filters.dateFrom && tx.date < filters.dateFrom) return false;
    if (filters.dateTo && tx.date > filters.dateTo) return false;
    if (filters.category && tx.category !== filters.category) return false;
    if (filters.minAmount && Number(tx.amount) < Number(filters.minAmount)) return false;
    if (filters.maxAmount && Number(tx.amount) > Number(filters.maxAmount)) return false;
    return true;
  });

  const handleDelete = (tx) => {
    removeTransaction(tx.id);
    setUndoItem(tx);
    if (undoTimer) clearTimeout(undoTimer);
    const t = setTimeout(() => setUndoItem(null), 4000);
    setUndoTimer(t);
  };

  const handleUndo = () => {
    if (!undoItem) return;
    clearTimeout(undoTimer);
    restoreTransaction(undoItem);
    setUndoItem(null);
  };

  useEffect(() => () => { if (undoTimer) clearTimeout(undoTimer); }, []);

  const exportCSV = () => {
    exportHTMLReport({
      transactions: monthFiltered,
      categories: allCategories,
      profile,
      cycleDay,
      selectedMonth,
    });
  };

  const p1Name = profile?.personOneName ?? "אלעד";
  const p2Name = profile?.personTwoName ?? "נויה";

  return (
    <Page>
      <FilterRow>
        {[
          { val: "both",      label: `הכל` },
          { val: "personOne", label: `${p1Name} 🙋🏽` },
          { val: "personTwo", label: `${p2Name} 🙋🏽‍♀️` },
        ].map((item) => (
          <FilterChip key={item.val} $active={active === item.val} onClick={() => setActive(item.val)}>
            {item.label}
          </FilterChip>
        ))}
      </FilterRow>

      <TypeTabsRow>
        {[
          { val: "all",     label: "הכל" },
          { val: "expense", label: "הוצאות 📉" },
          { val: "income",  label: "הכנסות 📈" },
        ].map((tab) => (
          <TypeTab
            key={tab.val}
            $active={typeTab === tab.val}
            $type={tab.val}
            onClick={() => setTypeTab(tab.val)}
          >
            {tab.label}
          </TypeTab>
        ))}
      </TypeTabsRow>

      <Wrapper>
        <Card>
          <CardHeader>
            <CardTitle>כל העסקאות</CardTitle>
            <CardActions>
              {selectedMonth && <MonthBadge>{selectedMonth}</MonthBadge>}
              <IconBtn $active={showFilters || hasActiveFilters} onClick={() => setShowFilters(v => !v)}>
                🔍 {hasActiveFilters ? "פעיל" : "סינון"}
              </IconBtn>
              {filteredTransactions.length > 0 && (
                <IconBtn onClick={exportCSV}>📄 PDF</IconBtn>
              )}
            </CardActions>
          </CardHeader>

          {showFilters && (
            <FilterPanel>
              <FilterInput
                type="text"
                placeholder="חיפוש לפי שם / תיאור..."
                value={filters.search}
                onChange={(e) => setFilter("search", e.target.value)}
              />
              <FilterInputRow>
                <FilterInput
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilter("dateFrom", e.target.value)}
                  style={{ textAlign: "left" }}
                />
                <FilterInput
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilter("dateTo", e.target.value)}
                  style={{ textAlign: "left" }}
                />
              </FilterInputRow>
              <FilterSelect
                value={filters.category}
                onChange={(e) => setFilter("category", e.target.value)}
              >
                <option value="">כל הקטגוריות</option>
                {allCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
                ))}
              </FilterSelect>
              <FilterInputRow>
                <FilterInput
                  type="number"
                  placeholder="מינימום ₪"
                  value={filters.minAmount}
                  onChange={(e) => setFilter("minAmount", e.target.value)}
                />
                <FilterInput
                  type="number"
                  placeholder="מקסימום ₪"
                  value={filters.maxAmount}
                  onChange={(e) => setFilter("maxAmount", e.target.value)}
                />
              </FilterInputRow>
              {hasActiveFilters && (
                <ClearBtn onClick={clearFilters}>נקה סינון ✕</ClearBtn>
              )}
            </FilterPanel>
          )}

          {!filteredTransactions.length ? (
            <EmptyState>
              <span style={{ fontSize: 48, marginBottom: 8 }}>🌟</span>
              <span style={{ color: "#4a5568" }}>אין עסקאות</span>
            </EmptyState>
          ) : (
            filteredTransactions.map((tx) => {
              const cat = getCatInfo(tx.type, tx.category);
              return (
                <SwipeableRow key={tx.id} onDelete={() => handleDelete(tx)}>
                  <TxRow>
                    <TxIcon $type={tx.type}>{cat.emoji}</TxIcon>
                    <TxInfo onClick={() => setActivityPage({ page: "edit", tx })}>
                      <TxTitle>{cat.label}</TxTitle>
                      {tx.description && <TxDesc>{tx.description}</TxDesc>}
                      <TxMeta>
                        {tx.date.split("-").reverse().join("/")}{tx.person && tx.person !== "both" ? ` · ${tx.person === "personOne" ? p1Name : p2Name}` : ""}{tx.installmentTotal ? ` · תשלום ${tx.installmentIndex}/${tx.installmentTotal}` : ""}
                      </TxMeta>
                    </TxInfo>
                    <TxAmount $type={tx.type}>
                      {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                    </TxAmount>
                  </TxRow>
                </SwipeableRow>
              );
            })
          )}
        </Card>
      </Wrapper>

      {undoItem && (
        <UndoToast>
          <span>עסקה נמחקה</span>
          <UndoBtn onClick={handleUndo}>בטל</UndoBtn>
        </UndoToast>
      )}
    </Page>
  );
}

export default History;

const Page = styled.div`
  padding: 8px 0 16px;
`;

const FilterRow = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px 8px;
`;

const FilterChip = styled.button`
  padding: 7px 14px;
  border-radius: 20px;
  border: 2px solid ${({ $active }) => $active ? "#6366f1" : "rgba(255,255,255,0.06)"};
  cursor: pointer;
  font-size: 13px;
  font-family: inherit;
  background: ${({ $active }) => $active ? "rgba(99,102,241,0.2)" : "#161b27"};
  color: ${({ $active }) => $active ? "#a5b4fc" : "#4a5568"};
  font-weight: ${({ $active }) => $active ? 700 : 400};
  transition: all 0.18s;
`;

const TypeTabsRow = styled.div`
  display: flex;
  margin: 0 16px 12px;
  background: #161b27;
  border-radius: 14px;
  padding: 4px;
  border: 1px solid rgba(255,255,255,0.04);
`;

const TypeTab = styled.button`
  flex: 1;
  padding: 8px 0;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.18s;
  background: ${({ $active, $type }) =>
    $active
      ? $type === "expense"
        ? "linear-gradient(135deg, #f472b6, #e11d48)"
        : $type === "income"
          ? "linear-gradient(135deg, #22d3a5, #059669)"
          : "linear-gradient(135deg, #6366f1, #8b5cf6)"
      : "transparent"};
  color: ${({ $active }) => $active ? "white" : "#4a5568"};
`;

const Wrapper = styled.div`
  padding: 0 16px 16px;
`;

const Card = styled.div`
  background: #161b27;
  border-radius: 20px;
  padding: 18px 16px;
  border: 1px solid rgba(255,255,255,0.04);
  box-shadow: 0 2px 16px rgba(0,0,0,0.2);
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
`;

const CardTitle = styled.div`
  font-weight: 700;
  font-size: 17px;
  color: #f0f4ff;
`;

const CardActions = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const MonthBadge = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: #a5b4fc;
  background: rgba(99,102,241,0.15);
  padding: 3px 8px;
  border-radius: 10px;
`;

const IconBtn = styled.button`
  background: ${({ $active }) => $active ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.06)"};
  color: ${({ $active }) => $active ? "#a5b4fc" : "#8b9dc3"};
  border: none;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  padding: 5px 10px;
  border-radius: 10px;
  transition: all 0.15s;
`;

const FilterPanel = styled.div`
  margin-bottom: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: #0d1117;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.04);
`;

const FilterInputRow = styled.div`
  display: flex;
  gap: 8px;
`;

const FilterInput = styled.input`
  flex: 1;
  padding: 8px 12px;
  border: 2px solid rgba(255,255,255,0.06);
  border-radius: 10px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  color: #f0f4ff;
  background: #161b27;
  text-align: right;
  width: 100%;

  &::placeholder { color: #2d3748; }
  &:focus { border-color: #6366f1; }
  &[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.7); }
`;

const FilterSelect = styled.select`
  flex: 1;
  padding: 8px 12px;
  border: 2px solid rgba(255,255,255,0.06);
  border-radius: 10px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  color: #f0f4ff;
  background: #161b27;
  width: 100%;

  &:focus { border-color: #6366f1; }

  option { background: #161b27; }
`;

const ClearBtn = styled.button`
  background: rgba(244,114,182,0.15);
  border: none;
  color: #f472b6;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  padding: 6px 14px;
  border-radius: 10px;
  align-self: flex-start;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 32px 0;
`;

const SwipeWrapper = styled.div`
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  &:last-child { border-bottom: none; }
`;

const SwipeDeleteBg = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(244,114,182,0.15);
  display: flex;
  align-items: center;
  padding-inline-start: 20px;
  opacity: ${({ $visible }) => $visible ? 1 : 0};
  transition: opacity 0.15s;
  font-size: 20px;
`;

const SwipeContent = styled.div`
  position: relative;
  background: #161b27;
  transition: ${({ $swiping }) => $swiping ? "none" : "transform 0.25s ease"};
  touch-action: pan-y;
  cursor: grab;
`;

const TxRow = styled.div`
  display: flex;
  align-items: center;
  padding: 10px 0;
  gap: 12px;
  background: #161b27;
`;

const TxIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: ${({ $type }) =>
    $type === "income" ? "rgba(34,211,165,0.12)" : "rgba(99,102,241,0.12)"};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
`;

const TxInfo = styled.div`
  flex: 1;
  min-width: 0;
  cursor: pointer;
`;

const TxTitle = styled.div`
  font-weight: 600;
  font-size: 14px;
  color: #f0f4ff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TxDesc = styled.div`
  font-size: 12px;
  color: #8b9dc3;
  margin-top: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TxMeta = styled.div`
  font-size: 11px;
  color: #4a5568;
  margin-top: 2px;
`;

const TxAmount = styled.div`
  font-weight: 700;
  font-size: 15px;
  color: ${({ $type }) => $type === "income" ? "#22d3a5" : "#f472b6"};
  flex-shrink: 0;
`;

const UndoToast = styled.div`
  position: fixed;
  bottom: 90px;
  left: 50%;
  transform: translateX(-50%);
  background: #1e2535;
  border: 1px solid rgba(99,102,241,0.2);
  color: white;
  padding: 11px 18px;
  border-radius: 24px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 1000;
  white-space: nowrap;
`;

const UndoBtn = styled.button`
  background: rgba(99,102,241,0.2);
  border: none;
  color: #a5b4fc;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  padding: 4px 10px;
  border-radius: 10px;
`;

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
  const [dragOffset, setDragOffset] = useState(0);
  const [filters, setFilters] = useState({ search: "", dateFrom: "", dateTo: "", category: "", minAmount: "", maxAmount: "", paymentMethod: "" });
  const sheetDragY = useRef(null);
  const isDraggingHandle = useRef(false);

  useEffect(() => {
    if (showFilters) {
      document.body.style.overflow = "hidden";
      setDragOffset(0);
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showFilters]);

  const allCategories = categories ?? [];
  const expenseCategories = allCategories.filter(c => c.type === "expense");
  const incomeCategories  = allCategories.filter(c => c.type === "income");

  const setFilter = (key, val) => setFilters((f) => ({ ...f, [key]: val }));
  const hasActiveFilters = Object.values(filters).some((v) => v !== "");
  const clearFilters = () => setFilters({ search: "", dateFrom: "", dateTo: "", category: "", minAmount: "", maxAmount: "", paymentMethod: "" });

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

  const filteredTransactions = personFiltered
    .filter((tx) => {
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
      if (filters.paymentMethod && tx.paymentMethod !== filters.paymentMethod) return false;
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const recurringTxs = filteredTransactions.filter((tx) => tx.recurring);
  const regularTxs   = filteredTransactions.filter((tx) => !tx.recurring);

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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4, verticalAlign: "middle" }}>
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                  <line x1="11" y1="18" x2="13" y2="18" />
                </svg>
                {hasActiveFilters ? "פעיל" : "סינון"}
              </IconBtn>
              {filteredTransactions.length > 0 && (
                <IconBtn onClick={exportCSV}>📄 PDF</IconBtn>
              )}
            </CardActions>
          </CardHeader>

          {!filteredTransactions.length ? (
            <EmptyState>
              <span style={{ fontSize: 48, marginBottom: 8 }}>🌟</span>
              <span style={{ color: "#4a5568" }}>אין עסקאות</span>
            </EmptyState>
          ) : (
            regularTxs.map((tx) => {
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

        {recurringTxs.length > 0 && (
          <RecurringCard>
            <CardHeader>
              <RecurringCardTitle>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 6, verticalAlign: "middle" }}>
                  <polyline points="17 1 21 5 17 9" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <polyline points="7 23 3 19 7 15" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
                קבועות
              </RecurringCardTitle>
            </CardHeader>
            {recurringTxs.map((tx) => {
              const cat = getCatInfo(tx.type, tx.category);
              return (
                <SwipeableRow key={tx.id} onDelete={() => handleDelete(tx)}>
                  <TxRow>
                    <TxIcon $type={tx.type}>{cat.emoji}</TxIcon>
                    <TxInfo onClick={() => setActivityPage({ page: "edit", tx })}>
                      <TxTitle>{cat.label}</TxTitle>
                      {tx.description && <TxDesc>{tx.description}</TxDesc>}
                      <TxMeta>
                        {tx.date.split("-").reverse().join("/")}{tx.person && tx.person !== "both" ? ` · ${tx.person === "personOne" ? p1Name : p2Name}` : ""}
                      </TxMeta>
                    </TxInfo>
                    <TxAmount $type={tx.type}>
                      {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                    </TxAmount>
                  </TxRow>
                </SwipeableRow>
              );
            })}
          </RecurringCard>
        )}
      </Wrapper>

      {undoItem && (
        <UndoToast>
          <span>עסקה נמחקה</span>
          <UndoBtn onClick={handleUndo}>בטל</UndoBtn>
        </UndoToast>
      )}

      {showFilters && (
        <FilterOverlay>
          <FilterSheet $dragOffset={dragOffset} onClick={e => e.stopPropagation()}>
            <FilterSheetHandle
              onTouchStart={e => {
                isDraggingHandle.current = true;
                sheetDragY.current = e.touches[0].clientY;
              }}
              onTouchMove={e => {
                if (!isDraggingHandle.current) return;
                const dy = Math.max(0, e.touches[0].clientY - sheetDragY.current);
                setDragOffset(dy);
              }}
              onTouchEnd={() => {
                if (dragOffset > 120) {
                  setShowFilters(false);
                } else {
                  setDragOffset(0);
                }
                isDraggingHandle.current = false;
                sheetDragY.current = null;
              }}
            />
            <FilterSheetHeader>
              <FilterSheetTitle>סינון עסקאות</FilterSheetTitle>
              {hasActiveFilters && (
                <FilterClearBtn onClick={clearFilters}>נקה הכל</FilterClearBtn>
              )}
            </FilterSheetHeader>

            <FilterSheetBody>
              <FilterSection>
                <FilterSectionLabel>חיפוש</FilterSectionLabel>
                <FilterSheetInput
                  type="text"
                  placeholder="שם קטגוריה או תיאור..."
                  value={filters.search}
                  onChange={e => setFilter("search", e.target.value)}
                />
              </FilterSection>

              <FilterSection>
                <FilterSectionLabel>קטגוריה</FilterSectionLabel>
                <FilterChipScroll>
                  {[{ id: "", emoji: "🔍", label: "הכל" }, ...allCategories].map(c => (
                    <FilterCatChip
                      key={c.id}
                      $active={filters.category === c.id}
                      onClick={() => setFilter("category", c.id)}
                    >
                      {c.emoji} {c.label}
                    </FilterCatChip>
                  ))}
                </FilterChipScroll>
              </FilterSection>

              <FilterSection>
                <FilterSectionLabel>שיטת תשלום</FilterSectionLabel>
                <FilterChipScroll>
                  {[
                    { val: "",         label: "הכל",     emoji: "🔍" },
                    { val: "credit",   label: "אשראי",   emoji: "💳" },
                    { val: "bit",      label: "ביט",     emoji: "📱" },
                    { val: "cash",     label: "מזומן",   emoji: "💵" },
                    { val: "transfer", label: "העברה",   emoji: "🏦" },
                    { val: "paybox",   label: "פייבוקס", emoji: "📲" },
                    { val: "check",    label: "צ׳ק",     emoji: "📝" },
                  ].map(p => (
                    <FilterCatChip
                      key={p.val}
                      $active={filters.paymentMethod === p.val}
                      onClick={() => setFilter("paymentMethod", p.val)}
                    >
                      {p.emoji} {p.label}
                    </FilterCatChip>
                  ))}
                </FilterChipScroll>
              </FilterSection>

              <FilterSection>
                <FilterSectionLabel>טווח תאריכים</FilterSectionLabel>
                <FilterDateRow>
                  <FilterSheetInput
                    type="date"
                    value={filters.dateFrom}
                    onChange={e => setFilter("dateFrom", e.target.value)}
                    style={{ direction: "ltr", textAlign: "left" }}
                  />
                  <FilterDateSep>—</FilterDateSep>
                  <FilterSheetInput
                    type="date"
                    value={filters.dateTo}
                    onChange={e => setFilter("dateTo", e.target.value)}
                    style={{ direction: "ltr", textAlign: "left" }}
                  />
                </FilterDateRow>
              </FilterSection>

              <FilterSection>
                <FilterSectionLabel>טווח סכום (₪)</FilterSectionLabel>
                <FilterDateRow>
                  <FilterSheetInput
                    type="number"
                    placeholder="מינימום"
                    value={filters.minAmount}
                    onChange={e => setFilter("minAmount", e.target.value)}
                    style={{ direction: "ltr", textAlign: "left" }}
                  />
                  <FilterDateSep>—</FilterDateSep>
                  <FilterSheetInput
                    type="number"
                    placeholder="מקסימום"
                    value={filters.maxAmount}
                    onChange={e => setFilter("maxAmount", e.target.value)}
                    style={{ direction: "ltr", textAlign: "left" }}
                  />
                </FilterDateRow>
              </FilterSection>
            </FilterSheetBody>

            <FilterSheetFooter>
              <ApplyBtn onClick={() => setShowFilters(false)}>
                הצג תוצאות ({filteredTransactions.length})
              </ApplyBtn>
            </FilterSheetFooter>
          </FilterSheet>
        </FilterOverlay>
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

const FilterOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: 500;
  display: flex;
  align-items: flex-end;
`;

const FilterSheet = styled.div`
  background: #161b27;
  border-radius: 24px 24px 0 0;
  width: 100%;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  border-top: 1px solid rgba(99,102,241,0.2);
  transform: translateY(${({ $dragOffset }) => $dragOffset ?? 0}px);
  transition: ${({ $dragOffset }) => $dragOffset > 0 ? "none" : "transform 0.3s ease"};
`;

const FilterSheetHandle = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 14px 0 8px;
  flex-shrink: 0;
  cursor: grab;
  touch-action: none;

  &::after {
    content: "";
    display: block;
    width: 40px;
    height: 5px;
    background: rgba(255,255,255,0.25);
    border-radius: 3px;
  }
`;

const FilterSheetHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px 10px;
  flex-shrink: 0;
`;

const FilterSheetTitle = styled.div`
  font-weight: 700;
  font-size: 17px;
  color: #f0f4ff;
`;

const FilterClearBtn = styled.button`
  background: none;
  border: none;
  color: #f472b6;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  padding: 4px 0;
`;

const FilterSheetBody = styled.div`
  overflow-y: auto;
  padding: 4px 20px 8px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const FilterSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const FilterSectionLabel = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: #4a5568;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const FilterSheetInput = styled.input`
  flex: 1;
  padding: 10px 14px;
  border: 1.5px solid rgba(255,255,255,0.07);
  border-radius: 12px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  color: #f0f4ff;
  background: #1e2535;
  text-align: right;

  &::placeholder { color: #2d3748; }
  &:focus { border-color: #6366f1; }
  &[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.7); }
`;

const FilterChipScroll = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const FilterCatChip = styled.button`
  padding: 7px 13px;
  border-radius: 20px;
  border: 1.5px solid ${({ $active }) => $active ? "#6366f1" : "rgba(255,255,255,0.07)"};
  background: ${({ $active }) => $active ? "rgba(99,102,241,0.22)" : "#1e2535"};
  color: ${({ $active }) => $active ? "#a5b4fc" : "#6b7aaa"};
  font-size: 13px;
  font-weight: ${({ $active }) => $active ? 700 : 400};
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
`;

const FilterDateRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const FilterDateSep = styled.span`
  color: #4a5568;
  font-size: 14px;
  flex-shrink: 0;
`;

const FilterSheetFooter = styled.div`
  padding: 12px 20px calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid rgba(255,255,255,0.05);
  flex-shrink: 0;
`;

const ApplyBtn = styled.button`
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

const RecurringCard = styled.div`
  background: #161b27;
  border-radius: 20px;
  padding: 18px 16px;
  border: 1px solid rgba(99,102,241,0.18);
  box-shadow: 0 2px 16px rgba(0,0,0,0.2);
  margin-top: 12px;
`;

const RecurringCardTitle = styled.div`
  font-weight: 700;
  font-size: 17px;
  color: #a5b4fc;
  display: flex;
  align-items: center;
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

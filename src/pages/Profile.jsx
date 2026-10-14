import { useState } from "react";
import styled from "styled-components";
import { getCycleLabel } from "../utils/monthUtils";
import { exportHTMLReport } from "../utils/exportReport";

const CURRENCIES = [
  { val: "ILS", symbol: "₪", label: "שקל (₪)" },
  { val: "USD", symbol: "$", label: "דולר ($)" },
  { val: "EUR", symbol: "€", label: "יורו (€)" },
];

const UTILITY_DEFAULTS = {
  electricity: { meterTotal: 0, pricePerUnit: 0.65, monthlyUsage: "" },
  water:        { meterTotal: 0, pricePerUnit: 12,   monthlyUsage: "" },
};

function UtilityModal({ type, data, onClose, onSave, onReset, onAddToExpenses, categories }) {
  const label    = type === "electricity" ? "חשמל" : "מים";
  const emoji    = type === "electricity" ? "⚡" : "💧";
  const unitName = type === "electricity" ? "קוט״ש" : "מ״ק";

  const [draft, setDraft] = useState({
    meterTotal:    data.meterTotal    ?? 0,
    pricePerUnit:  data.pricePerUnit  ?? UTILITY_DEFAULTS[type].pricePerUnit,
    monthlyUsage:  data.monthlyUsage  ?? "",
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const cost = draft.monthlyUsage ? (Number(draft.monthlyUsage) * Number(draft.pricePerUnit)) : 0;

  const handleAddToExpenses = () => {
    if (!draft.monthlyUsage || Number(draft.monthlyUsage) <= 0) return;
    const [year, month] = selectedMonth.split("-").map(Number);
    const date = `${year}-${String(month).padStart(2, "0")}-01`;
    onAddToExpenses({
      type,
      amount: cost,
      date,
      usage: Number(draft.monthlyUsage),
      newMeterTotal: Number(draft.meterTotal) + Number(draft.monthlyUsage),
      pricePerUnit: Number(draft.pricePerUnit),
    });
  };

  const handleReset = () => {
    onReset(type);
    setShowResetConfirm(false);
  };

  return (
    <ModalOverlay onClick={onClose}>
      <UtilitySheet onClick={e => e.stopPropagation()}>
        <UtilitySheetHeader>
          <UtilitySheetTitle>{emoji} {label}</UtilitySheetTitle>
          <CloseBtn onClick={onClose}>✕</CloseBtn>
        </UtilitySheetHeader>

        <UtilitySheetBody>
          {/* Meter reading */}
          <UtilityFieldGroup>
            <UtilityFieldLabel>קריאת שעון כוללת ({unitName})</UtilityFieldLabel>
            <UtilityInput
              type="number"
              value={draft.meterTotal}
              onChange={e => setDraft(d => ({ ...d, meterTotal: e.target.value }))}
              onBlur={() => onSave(type, { ...data, meterTotal: Number(draft.meterTotal) })}
              placeholder="0"
            />
          </UtilityFieldGroup>

          {/* Price per unit */}
          <UtilityFieldGroup>
            <UtilityFieldLabel>מחיר ליחידה (₪ / {unitName})</UtilityFieldLabel>
            <UtilityInput
              type="number"
              value={draft.pricePerUnit}
              onChange={e => setDraft(d => ({ ...d, pricePerUnit: e.target.value }))}
              onBlur={() => onSave(type, { ...data, pricePerUnit: Number(draft.pricePerUnit) })}
              placeholder="0"
            />
          </UtilityFieldGroup>

          {/* Monthly usage */}
          <UtilityFieldGroup>
            <UtilityFieldLabel>צריכה החודש ({unitName})</UtilityFieldLabel>
            <UtilityInput
              type="number"
              value={draft.monthlyUsage}
              onChange={e => setDraft(d => ({ ...d, monthlyUsage: e.target.value }))}
              placeholder="0"
            />
          </UtilityFieldGroup>

          {/* Month picker */}
          <UtilityFieldGroup>
            <UtilityFieldLabel>חודש לחיוב</UtilityFieldLabel>
            <MonthPickerRow>
              <UtilitySelect
                value={selectedMonth.split("-")[1]}
                onChange={e => setSelectedMonth(s => `${s.split("-")[0]}-${e.target.value}`)}
              >
                {[["01","ינואר"],["02","פברואר"],["03","מרץ"],["04","אפריל"],["05","מאי"],["06","יוני"],["07","יולי"],["08","אוגוסט"],["09","ספטמבר"],["10","אוקטובר"],["11","נובמבר"],["12","דצמבר"]].map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </UtilitySelect>
              <UtilitySelect
                value={selectedMonth.split("-")[0]}
                onChange={e => setSelectedMonth(s => `${e.target.value}-${s.split("-")[1]}`)}
                style={{ maxWidth: 90 }}
              >
                {[2024,2025,2026,2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </UtilitySelect>
            </MonthPickerRow>
          </UtilityFieldGroup>

          {/* Cost preview */}
          {cost > 0 && (
            <CostPreview>
              <CostPreviewLabel>עלות משוערת</CostPreviewLabel>
              <CostPreviewAmount>
                ₪{cost.toLocaleString("he-IL", { maximumFractionDigits: 2 })}
              </CostPreviewAmount>
            </CostPreview>
          )}

          {/* Action buttons */}
          <UtilityActions>
            <AddExpenseBtn
              onClick={handleAddToExpenses}
              disabled={!draft.monthlyUsage || Number(draft.monthlyUsage) <= 0}
            >
              הוסף להוצאות ✓
            </AddExpenseBtn>
            <ResetMeterBtn onClick={() => setShowResetConfirm(true)}>
              איפוס שעון
            </ResetMeterBtn>
          </UtilityActions>
        </UtilitySheetBody>

        {/* Reset confirm */}
        {showResetConfirm && (
          <ResetConfirmOverlay onClick={() => setShowResetConfirm(false)}>
            <ResetConfirmBox onClick={e => e.stopPropagation()}>
              <ResetConfirmTitle>לאפס את קריאת השעון?</ResetConfirmTitle>
              <ResetConfirmSub>קריאת השעון תחזור לאפס</ResetConfirmSub>
              <ResetConfirmActions>
                <CancelSmallBtn onClick={() => setShowResetConfirm(false)}>ביטול</CancelSmallBtn>
                <ResetConfirmBtn onClick={handleReset}>אפס</ResetConfirmBtn>
              </ResetConfirmActions>
            </ResetConfirmBox>
          </ResetConfirmOverlay>
        )}
      </UtilitySheet>
    </ModalOverlay>
  );
}

function Profile({ profile, setProfile, transactions, categories, clearAllData, addTransaction }) {
  const [editingPerson, setEditingPerson] = useState(null);
  const [nameDraft, setNameDraft] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [openUtility, setOpenUtility] = useState(null); // "electricity" | "water" | null
  const [incomeDraft, setIncomeDraft] = useState({
    personOneMonthlyIncome: profile.personOneMonthlyIncome,
    personTwoMonthlyIncome: profile.personTwoMonthlyIncome,
  });
  const [incomeSaved, setIncomeSaved] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState({
    currency: profile.currency,
    monthCycleDay: profile.monthCycleDay ?? 1,
  });
  const [settingsSaved, setSettingsSaved] = useState(false);

  const p1Name = profile.personOneName;
  const p2Name = profile.personTwoName;

  const saveIncome = () => {
    setProfile(p => ({ ...p, ...incomeDraft }));
    setIncomeSaved(true);
    setTimeout(() => setIncomeSaved(false), 2000);
  };

  const saveSettings = () => {
    const cycleDay = Math.min(28, Math.max(1, parseInt(settingsDraft.monthCycleDay) || 1));
    setProfile(p => ({ ...p, currency: settingsDraft.currency, monthCycleDay: cycleDay }));
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

  const totalMonthlyIncome = (Number(incomeDraft.personOneMonthlyIncome) || 0) +
                             (Number(incomeDraft.personTwoMonthlyIncome) || 0);
  const tithe = totalMonthlyIncome * 0.1;

  const expenseCategories = categories.filter(c => c.type === "expense");

  const formatCurrency = (amount) => {
    const sym = CURRENCIES.find(c => c.val === profile.currency)?.symbol ?? "₪";
    return `${sym}${Number(amount).toLocaleString("he-IL")}`;
  };

  const openEditName = (person) => {
    setEditingPerson(person);
    setNameDraft(person === "personOne" ? p1Name : p2Name);
  };

  const saveName = () => {
    if (!nameDraft.trim()) return;
    setProfile(p => ({
      ...p,
      [editingPerson === "personOne" ? "personOneName" : "personTwoName"]: nameDraft.trim(),
    }));
    setEditingPerson(null);
  };

  const exportAllCSV = () => {
    const cycleDay = profile.monthCycleDay ?? 1;
    const cycles = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date();
      d.setDate(cycleDay);
      d.setMonth(d.getMonth() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(cycleDay).padStart(2, "0")}`;
      cycles.push(getCycleLabel(dateStr, cycleDay));
    }
    const last12 = transactions.filter(tx => cycles.includes(getCycleLabel(tx.date, cycleDay)));
    exportHTMLReport({
      transactions: last12,
      categories,
      profile,
      cycleDay,
    });
  };

  const clearAllData_ = () => {
    clearAllData();
    setShowClearConfirm(false);
  };

  // ── Utilities ────────────────────────────────────────────────
  const utilities = profile.utilities ?? {
    electricity: { ...UTILITY_DEFAULTS.electricity },
    water:       { ...UTILITY_DEFAULTS.water },
  };

  const saveUtility = (type, data) => {
    setProfile(p => ({
      ...p,
      utilities: { ...(p.utilities ?? {}), [type]: data },
    }));
  };

  const resetUtilityMeter = (type) => {
    setProfile(p => ({
      ...p,
      utilities: {
        ...(p.utilities ?? {}),
        [type]: { ...(p.utilities?.[type] ?? UTILITY_DEFAULTS[type]), meterTotal: 0 },
      },
    }));
  };

  const handleUtilityAddToExpenses = ({ type, amount, date, usage, newMeterTotal, pricePerUnit }) => {
    const label = type === "electricity" ? "חשמל" : "מים";
    const emoji = type === "electricity" ? "⚡" : "💧";
    const utilityCategory = categories.find(c =>
      c.type === "expense" && (c.label.includes(label) || c.label.includes(type))
    );
    addTransaction({
      id:          crypto.randomUUID(),
      type:        "expense",
      amount,
      date,
      category:    utilityCategory?.id ?? categories.find(c => c.type === "expense")?.id ?? "other",
      description: `${emoji} ${label} — ${usage} יחידות`,
      person:      "both",
    });
    setProfile(p => ({
      ...p,
      utilities: {
        ...(p.utilities ?? {}),
        [type]: {
          ...(p.utilities?.[type] ?? UTILITY_DEFAULTS[type]),
          meterTotal:   newMeterTotal,
          monthlyUsage: "",
          pricePerUnit,
        },
      },
    }));
    setOpenUtility(null);
  };

  // ── Statistics ──────────────────────────────────────────────

  const getLast6MonthsData = () => {
    const cycleDay = profile.monthCycleDay ?? 1;
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(cycleDay);
      d.setMonth(d.getMonth() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(cycleDay).padStart(2, "0")}`;
      const label = getCycleLabel(dateStr, cycleDay);
      const shortLabel = label.split("–")[0].trim().split(" ")[0].slice(0, 4);
      const monthTx = transactions.filter(tx => getCycleLabel(tx.date, cycleDay) === label);
      const income  = monthTx.filter(t => t.type === "income") .reduce((s, t) => s + Number(t.amount), 0);
      const expense = monthTx.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
      months.push({ label, shortLabel, income, expense });
    }
    return months;
  };

  const monthsData = getLast6MonthsData();
  const maxVal = Math.max(...monthsData.flatMap(m => [m.income, m.expense]), 1);

  const catTotals = expenseCategories.map(cat => ({
    ...cat,
    total: transactions.filter(tx => tx.type === "expense" && tx.category === cat.id).reduce((s, tx) => s + Number(tx.amount), 0),
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  const grandTotal = catTotals.reduce((s, c) => s + c.total, 0);
  const topCat = catTotals[0];

  const totalIncome  = transactions.filter(t => t.type === "income") .reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

  return (
    <Page>
      <PageTitle>פרופיל</PageTitle>

      {/* Person Cards */}
      <Section>
        <SectionTitle>אנשים</SectionTitle>
        <PersonCards>
          {[
            { key: "personOne", name: p1Name, emoji: "🙋🏽" },
            { key: "personTwo", name: p2Name, emoji: "🙋🏽‍♀️" },
          ].map(p => (
            <PersonCard key={p.key} onClick={() => openEditName(p.key)}>
              <PersonAvatar>{p.name.charAt(0).toUpperCase()}</PersonAvatar>
              <PersonName>{p.name}</PersonName>
              <PersonEmoji>{p.emoji}</PersonEmoji>
              <EditHint>לחץ לעריכה ✏️</EditHint>
            </PersonCard>
          ))}
        </PersonCards>
      </Section>

      {/* Monthly Income */}
      <Section>
        <SectionTitle>הכנסה חודשית צפויה</SectionTitle>
        <IncomeRow>
          <IncomeItem>
            <IncomeLabel>{p1Name}</IncomeLabel>
            <IncomeInput
              type="number"
              placeholder="0 ₪"
              value={incomeDraft.personOneMonthlyIncome}
              onChange={e => setIncomeDraft(d => ({ ...d, personOneMonthlyIncome: e.target.value }))}
            />
          </IncomeItem>
          <IncomeItem>
            <IncomeLabel>{p2Name}</IncomeLabel>
            <IncomeInput
              type="number"
              placeholder="0 ₪"
              value={incomeDraft.personTwoMonthlyIncome}
              onChange={e => setIncomeDraft(d => ({ ...d, personTwoMonthlyIncome: e.target.value }))}
            />
          </IncomeItem>
        </IncomeRow>

        <SaveIncomeBtn onClick={saveIncome} $saved={incomeSaved}>
          {incomeSaved ? "✓ נשמר!" : "שמור"}
        </SaveIncomeBtn>

        {totalMonthlyIncome > 0 && (
          <TitheBox>
            <TitheRow>
              <TitheLabel>סה״כ הכנסה משולבת</TitheLabel>
              <TitheValue>{formatCurrency(totalMonthlyIncome)}</TitheValue>
            </TitheRow>
            <TitheDivider />
            <TitheRow>
              <TitheLabel>🕊️ מעשרות (10%)</TitheLabel>
              <TitheValue $highlight>{formatCurrency(tithe)}</TitheValue>
            </TitheRow>
            <TitheSub>יש להעביר {formatCurrency(tithe)} בחודש</TitheSub>
          </TitheBox>
        )}
      </Section>

      {/* Settings */}
      <Section>
        <SectionTitle>הגדרות</SectionTitle>
        <SettingRow>
          <SettingLabel>מטבע</SettingLabel>
          <CurrencySelect
            value={settingsDraft.currency}
            onChange={e => setSettingsDraft(d => ({ ...d, currency: e.target.value }))}
          >
            {CURRENCIES.map(c => (
              <option key={c.val} value={c.val}>{c.label}</option>
            ))}
          </CurrencySelect>
        </SettingRow>

        <CycleDayRow>
          <div>
            <SettingLabel>יום תחילת חודש</SettingLabel>
            <SettingHint>חודש מתחיל ב-{settingsDraft.monthCycleDay} לכל חודש</SettingHint>
          </div>
          <CycleDayInput
            type="number"
            min="1"
            max="28"
            value={settingsDraft.monthCycleDay}
            onChange={e => setSettingsDraft(d => ({ ...d, monthCycleDay: e.target.value }))}
          />
        </CycleDayRow>

        <SaveSettingsBtn onClick={saveSettings} $saved={settingsSaved}>
          {settingsSaved ? "✓ נשמר!" : "שמור הגדרות"}
        </SaveSettingsBtn>
      </Section>

      {/* Statistics */}
      {transactions.length > 0 && (
        <>
          <Section>
            <SectionTitle>סיכום כולל</SectionTitle>
            <StatsRow>
              <StatBox>
                <StatVal style={{ color: "#22d3a5" }}>{formatCurrency(totalIncome)}</StatVal>
                <StatLbl>סה״כ הכנסות</StatLbl>
              </StatBox>
              <StatBox>
                <StatVal style={{ color: "#f472b6" }}>{formatCurrency(totalExpense)}</StatVal>
                <StatLbl>סה״כ הוצאות</StatLbl>
              </StatBox>
            </StatsRow>
            {topCat && (
              <TopCatBadge>
                <span style={{ fontSize: 24 }}>{topCat.emoji}</span>
                <TopCatText>
                  <TopCatLabel>קטגוריה מובילה</TopCatLabel>
                  <TopCatName>{topCat.label} — {formatCurrency(topCat.total)}</TopCatName>
                </TopCatText>
              </TopCatBadge>
            )}
          </Section>

          <Section>
            <SectionTitle>6 חודשים אחרונים</SectionTitle>
            <BarChart>
              {monthsData.map((m, i) => (
                <BarGroup key={i}>
                  <Bars>
                    <Bar
                      style={{ height: `${(m.income / maxVal) * 80}px` }}
                      $color="#22d3a5"
                      title={`הכנסות: ${formatCurrency(m.income)}`}
                    />
                    <Bar
                      style={{ height: `${(m.expense / maxVal) * 80}px` }}
                      $color="#f472b6"
                      title={`הוצאות: ${formatCurrency(m.expense)}`}
                    />
                  </Bars>
                  <BarLabel>{m.shortLabel}</BarLabel>
                </BarGroup>
              ))}
            </BarChart>
            <ChartLegend>
              <LegendItem $color="#22d3a5">הכנסות</LegendItem>
              <LegendItem $color="#f472b6">הוצאות</LegendItem>
            </ChartLegend>
          </Section>

          {catTotals.length > 0 && (
            <Section>
              <SectionTitle>פירוט הוצאות (כולל)</SectionTitle>
              {catTotals.slice(0, 6).map(cat => (
                <CatStatRow key={cat.id}>
                  <CatStatLeft>
                    <span style={{ fontSize: 20 }}>{cat.emoji}</span>
                    <span style={{ color: "#c7d2e8", fontSize: 13, fontWeight: 500 }}>{cat.label}</span>
                  </CatStatLeft>
                  <CatStatRight>
                    <CatStatAmount>{formatCurrency(cat.total)}</CatStatAmount>
                    <CatStatPct>{grandTotal > 0 ? Math.round((cat.total / grandTotal) * 100) : 0}%</CatStatPct>
                  </CatStatRight>
                </CatStatRow>
              ))}
            </Section>
          )}
        </>
      )}

      {/* Utilities */}
      <Section>
        <SectionTitle>חשמל ומים</SectionTitle>
        <UtilityRow>
          {[
            { type: "electricity", emoji: "⚡", label: "חשמל", unitName: "קוט״ש" },
            { type: "water",       emoji: "💧", label: "מים",  unitName: "מ״ק"   },
          ].map(u => {
            const uData = utilities[u.type] ?? UTILITY_DEFAULTS[u.type];
            return (
              <UtilityCard key={u.type} onClick={() => setOpenUtility(u.type)}>
                <UtilityCardEmoji>{u.emoji}</UtilityCardEmoji>
                <UtilityCardLabel>{u.label}</UtilityCardLabel>
                <UtilityCardMeter>{Number(uData.meterTotal).toLocaleString("he-IL")} {u.unitName}</UtilityCardMeter>
                <UtilityCardSub>₪{Number(uData.pricePerUnit).toFixed(2)} / {u.unitName}</UtilityCardSub>
                {uData.monthlyUsage ? (
                  <UtilityCardUsage>החודש: {uData.monthlyUsage} {u.unitName}</UtilityCardUsage>
                ) : (
                  <UtilityCardUsage $empty>לחץ לעדכון</UtilityCardUsage>
                )}
              </UtilityCard>
            );
          })}
        </UtilityRow>
      </Section>

      {/* Data Management */}
      <Section>
        <SectionTitle>ניהול נתונים</SectionTitle>
        <DataBtn onClick={exportAllCSV}>📄 ייצוא דוח מלא (PDF)</DataBtn>
        <DataBtn $danger onClick={() => setShowClearConfirm(true)}>🗑️ מחק את כל הנתונים</DataBtn>
      </Section>

      {/* Utility Modal */}
      {openUtility && (
        <UtilityModal
          type={openUtility}
          data={utilities[openUtility] ?? UTILITY_DEFAULTS[openUtility]}
          onClose={() => setOpenUtility(null)}
          onSave={saveUtility}
          onReset={resetUtilityMeter}
          onAddToExpenses={handleUtilityAddToExpenses}
          categories={categories}
        />
      )}

      {/* Edit Name Modal */}
      {editingPerson && (
        <ModalOverlay onClick={() => setEditingPerson(null)}>
          <ModalSheet onClick={e => e.stopPropagation()}>
            <ModalHeader>
              <span>עריכת שם</span>
              <CloseBtn onClick={() => setEditingPerson(null)}>✕</CloseBtn>
            </ModalHeader>
            <ModalBody>
              <ModalInput
                placeholder="שם..."
                value={nameDraft}
                onChange={e => setNameDraft(e.target.value)}
                autoFocus
              />
            </ModalBody>
            <ModalFooter>
              <SaveBtn onClick={saveName} disabled={!nameDraft.trim()}>שמור ✓</SaveBtn>
            </ModalFooter>
          </ModalSheet>
        </ModalOverlay>
      )}

      {/* Clear Confirm Modal */}
      {showClearConfirm && (
        <ModalOverlay onClick={() => setShowClearConfirm(false)}>
          <ConfirmSheet onClick={e => e.stopPropagation()}>
            <ConfirmEmoji>⚠️</ConfirmEmoji>
            <ConfirmTitle>מחק את כל הנתונים?</ConfirmTitle>
            <ConfirmSub>כל העסקאות וההכנסות החוזרות יימחקו לצמיתות</ConfirmSub>
            <ConfirmActions>
              <CancelBtn onClick={() => setShowClearConfirm(false)}>ביטול</CancelBtn>
              <DeleteConfirmBtn onClick={clearAllData_}>מחק הכל</DeleteConfirmBtn>
            </ConfirmActions>
          </ConfirmSheet>
        </ModalOverlay>
      )}
    </Page>
  );
}

export default Profile;

const Page = styled.div`
  padding: 16px 16px 32px;
`;

const PageTitle = styled.div`
  font-size: 22px;
  font-weight: 800;
  color: #f0f4ff;
  letter-spacing: -0.5px;
  margin-bottom: 20px;
`;

const Section = styled.div`
  background: #161b27;
  border-radius: 20px;
  padding: 16px;
  margin-bottom: 14px;
  border: 1px solid rgba(255,255,255,0.04);
  box-shadow: 0 2px 16px rgba(0,0,0,0.2);
`;

const SectionTitle = styled.div`
  font-weight: 700;
  font-size: 15px;
  color: #f0f4ff;
  margin-bottom: 14px;
`;

const PersonCards = styled.div`
  display: flex;
  gap: 12px;
`;

const PersonCard = styled.div`
  flex: 1;
  background: #1e2535;
  border-radius: 16px;
  padding: 16px;
  text-align: center;
  cursor: pointer;
  border: 1px solid rgba(99,102,241,0.1);
  transition: border-color 0.15s;

  &:active { border-color: rgba(99,102,241,0.4); }
`;

const PersonAvatar = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  font-size: 22px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 8px;
`;

const PersonName = styled.div`
  font-weight: 700;
  font-size: 15px;
  color: #f0f4ff;
  margin-bottom: 2px;
`;

const PersonEmoji = styled.div`
  font-size: 18px;
  margin-bottom: 4px;
`;

const EditHint = styled.div`
  font-size: 11px;
  color: #4a5568;
`;

const SaveIncomeBtn = styled.button`
  width: 100%;
  margin-top: 12px;
  padding: 11px;
  border: none;
  border-radius: 12px;
  background: ${({ $saved }) => $saved
    ? "linear-gradient(135deg, #22d3a5, #059669)"
    : "linear-gradient(135deg, #6366f1, #8b5cf6)"};
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.3s;
`;

const TitheBox = styled.div`
  margin-top: 14px;
  background: rgba(99,102,241,0.07);
  border: 1px solid rgba(99,102,241,0.18);
  border-radius: 14px;
  padding: 14px;
`;

const TitheRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
`;

const TitheLabel = styled.div`
  font-size: 13px;
  color: #8b9dc3;
  font-weight: 500;
`;

const TitheValue = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${({ $highlight }) => $highlight ? "#a5b4fc" : "#f0f4ff"};
`;

const TitheDivider = styled.div`
  height: 1px;
  background: rgba(255,255,255,0.06);
  margin: 8px 0;
`;

const TitheSub = styled.div`
  font-size: 12px;
  color: #6366f1;
  font-weight: 600;
  margin-top: 8px;
  text-align: center;
`;

const IncomeRow = styled.div`
  display: flex;
  gap: 12px;
`;

const IncomeItem = styled.div`
  flex: 1;
`;

const IncomeLabel = styled.div`
  font-size: 12px;
  color: #8b9dc3;
  margin-bottom: 6px;
  font-weight: 500;
`;

const IncomeInput = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: 2px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  background: #1e2535;
  color: #f0f4ff;
  font-size: 15px;
  font-family: inherit;
  outline: none;
  text-align: right;
  direction: ltr;

  &::placeholder { color: #2d3748; }
  &:focus { border-color: #6366f1; }
`;

const CycleDayRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 14px;
  padding: 12px 14px;
  background: rgba(99,102,241,0.06);
  border: 1px solid rgba(99,102,241,0.12);
  border-radius: 14px;
`;

const SaveSettingsBtn = styled.button`
  width: 100%;
  margin-top: 14px;
  padding: 11px;
  border: none;
  border-radius: 12px;
  background: ${({ $saved }) => $saved
    ? "linear-gradient(135deg, #22d3a5, #059669)"
    : "linear-gradient(135deg, #6366f1, #8b5cf6)"};
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.3s;
`;

const SettingHint = styled.div`
  font-size: 11px;
  color: #4a5568;
  margin-top: 2px;
`;

const CycleDayInput = styled.input`
  width: 56px;
  padding: 8px 10px;
  border: 2px solid rgba(99,102,241,0.2);
  border-radius: 10px;
  background: #1e2535;
  color: #f0f4ff;
  font-size: 16px;
  font-weight: 700;
  font-family: inherit;
  outline: none;
  text-align: center;

  &:focus { border-color: #6366f1; }
`;

const SettingRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const SettingLabel = styled.div`
  font-size: 14px;
  color: #c7d2e8;
  font-weight: 500;
`;

const CurrencySelect = styled.select`
  padding: 8px 12px;
  border: 2px solid rgba(99,102,241,0.2);
  border-radius: 10px;
  background: #1e2535;
  color: #f0f4ff;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  cursor: pointer;

  &:focus { border-color: #6366f1; }
  option { background: #161b27; }
`;

const StatsRow = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 14px;
`;

const StatBox = styled.div`
  flex: 1;
  background: #1e2535;
  border-radius: 14px;
  padding: 12px;
  text-align: center;
`;

const StatVal = styled.div`
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.5px;
  margin-bottom: 4px;
`;

const StatLbl = styled.div`
  font-size: 11px;
  color: #8b9dc3;
`;

const TopCatBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(99,102,241,0.08);
  border: 1px solid rgba(99,102,241,0.15);
  border-radius: 14px;
`;

const TopCatText = styled.div``;
const TopCatLabel = styled.div`
  font-size: 11px;
  color: #8b9dc3;
  font-weight: 500;
`;
const TopCatName = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #f0f4ff;
`;

const BarChart = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 100px;
  padding-bottom: 24px;
  position: relative;
`;

const BarGroup = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  position: relative;
`;

const Bars = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 80px;
`;

const Bar = styled.div`
  width: 10px;
  border-radius: 4px 4px 0 0;
  background: ${({ $color }) => $color};
  min-height: 3px;
  transition: height 0.4s ease;
  opacity: 0.85;
`;

const BarLabel = styled.div`
  font-size: 10px;
  color: #4a5568;
  position: absolute;
  bottom: -20px;
  white-space: nowrap;
`;

const ChartLegend = styled.div`
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-top: 8px;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #8b9dc3;

  &::before {
    content: "";
    display: block;
    width: 10px;
    height: 10px;
    border-radius: 3px;
    background: ${({ $color }) => $color};
  }
`;

const CatStatRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  &:last-child { border-bottom: none; }
`;

const CatStatLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const CatStatRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CatStatAmount = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #f472b6;
`;

const CatStatPct = styled.div`
  font-size: 12px;
  color: #4a5568;
  min-width: 30px;
  text-align: left;
`;

const DataBtn = styled.button`
  width: 100%;
  padding: 13px;
  border: none;
  border-radius: 14px;
  background: ${({ $danger }) =>
    $danger ? "rgba(244,114,182,0.1)" : "rgba(99,102,241,0.1)"};
  color: ${({ $danger }) => $danger ? "#f472b6" : "#a5b4fc"};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  margin-bottom: 8px;
  border: 1px solid ${({ $danger }) =>
    $danger ? "rgba(244,114,182,0.15)" : "rgba(99,102,241,0.15)"};
  transition: all 0.15s;
  text-align: center;

  &:last-child { margin-bottom: 0; }
  &:active { opacity: 0.8; }
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
  max-height: 70vh;
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
  padding: 16px 20px;
  flex: 1;
`;

const ModalInput = styled.input`
  width: 100%;
  padding: 14px;
  border: 2px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  background: #1e2535;
  color: #f0f4ff;
  font-size: 18px;
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

// ── Utilities ─────────────────────────────────────────────────────────────────

const UtilityRow = styled.div`
  display: flex;
  gap: 12px;
`;

const UtilityCard = styled.div`
  flex: 1;
  background: #1e2535;
  border-radius: 16px;
  padding: 16px 12px;
  text-align: center;
  cursor: pointer;
  border: 1px solid rgba(99,102,241,0.1);
  transition: border-color 0.15s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;

  &:active { border-color: rgba(99,102,241,0.4); }
`;

const UtilityCardEmoji = styled.div`
  font-size: 28px;
  margin-bottom: 2px;
`;

const UtilityCardLabel = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: #f0f4ff;
`;

const UtilityCardMeter = styled.div`
  font-size: 15px;
  font-weight: 800;
  color: #a5b4fc;
  letter-spacing: -0.3px;
`;

const UtilityCardSub = styled.div`
  font-size: 11px;
  color: #4a5568;
`;

const UtilityCardUsage = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: ${({ $empty }) => $empty ? "#4a5568" : "#22d3a5"};
  margin-top: 2px;
`;

const UtilitySheet = styled.div`
  background: #161b27;
  border-radius: 24px 24px 0 0;
  width: 100%;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  border-top: 1px solid rgba(99,102,241,0.2);
  position: relative;
`;

const UtilitySheetHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 20px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
`;

const UtilitySheetTitle = styled.div`
  font-size: 18px;
  font-weight: 800;
  color: #f0f4ff;
`;

const UtilitySheetBody = styled.div`
  overflow-y: auto;
  padding: 18px 20px calc(18px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const UtilityFieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const UtilityFieldLabel = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: #4a5568;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const UtilityInput = styled.input`
  width: 100%;
  padding: 12px 14px;
  border: 1.5px solid rgba(255,255,255,0.07);
  border-radius: 12px;
  background: #1e2535;
  color: #f0f4ff;
  font-size: 16px;
  font-weight: 600;
  font-family: inherit;
  outline: none;
  text-align: right;
  box-sizing: border-box;

  &::placeholder { color: #2d3748; font-weight: 400; }
  &:focus { border-color: #6366f1; }
  &[type="month"] {
    direction: ltr;
    text-align: left;
    font-size: 14px;
    font-weight: 400;
    color: #f0f4ff;
    &::-webkit-calendar-picker-indicator { filter: invert(0.7); }
  }
`;

const CostPreview = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  background: rgba(99,102,241,0.08);
  border: 1px solid rgba(99,102,241,0.18);
  border-radius: 14px;
`;

const CostPreviewLabel = styled.div`
  font-size: 13px;
  color: #8b9dc3;
  font-weight: 500;
`;

const CostPreviewAmount = styled.div`
  font-size: 20px;
  font-weight: 800;
  color: #a5b4fc;
  letter-spacing: -0.5px;
`;

const UtilityActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 4px;
`;

const AddExpenseBtn = styled.button`
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 14px;
  background: ${({ disabled }) => disabled
    ? "rgba(99,102,241,0.2)"
    : "linear-gradient(135deg, #6366f1, #8b5cf6)"};
  color: ${({ disabled }) => disabled ? "#4a5568" : "white"};
  font-size: 15px;
  font-weight: 700;
  cursor: ${({ disabled }) => disabled ? "default" : "pointer"};
  font-family: inherit;
  box-shadow: ${({ disabled }) => disabled ? "none" : "0 4px 16px rgba(99,102,241,0.35)"};
  transition: all 0.2s;
`;

const ResetMeterBtn = styled.button`
  width: 100%;
  padding: 12px;
  border: 1px solid rgba(244,114,182,0.2);
  border-radius: 14px;
  background: rgba(244,114,182,0.07);
  color: #f472b6;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
`;

const MonthPickerRow = styled.div`
  display: flex;
  gap: 8px;
`;

const UtilitySelect = styled.select`
  flex: 1;
  padding: 12px 10px;
  border: 1.5px solid rgba(255,255,255,0.07);
  border-radius: 12px;
  background: #1e2535;
  color: #f0f4ff;
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  outline: none;
  text-align: right;
  box-sizing: border-box;

  &:focus { border-color: #6366f1; }
  option { background: #161b27; }
`;

const ResetConfirmOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.7);
  border-radius: 24px 24px 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`;

const ResetConfirmBox = styled.div`
  background: #1e2535;
  border-radius: 20px;
  padding: 24px;
  width: 100%;
  border: 1px solid rgba(244,114,182,0.2);
  text-align: center;
`;

const ResetConfirmTitle = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: #f0f4ff;
  margin-bottom: 6px;
`;

const ResetConfirmSub = styled.div`
  font-size: 13px;
  color: #8b9dc3;
  margin-bottom: 20px;
`;

const ResetConfirmActions = styled.div`
  display: flex;
  gap: 10px;
`;

const CancelSmallBtn = styled.button`
  flex: 1;
  padding: 11px;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  background: transparent;
  color: #8b9dc3;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
`;

const ResetConfirmBtn = styled.button`
  flex: 1;
  padding: 11px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #f472b6, #e11d48);
  color: white;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
`;

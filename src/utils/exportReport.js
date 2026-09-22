import { getCycleLabel } from "./monthUtils";

function personLabel(p, p1Name, p2Name) {
  if (!p || p === "both") return `${p1Name} + ${p2Name}`;
  return p === "personOne" ? p1Name : p2Name;
}

function catLabel(id, categories) {
  return categories.find(c => c.id === id)?.label ?? id;
}

function catEmoji(id, categories) {
  return categories.find(c => c.id === id)?.emoji ?? "📦";
}

function fmt(n) {
  return "₪" + Number(n).toLocaleString("he-IL");
}

// Build SVG pie chart
function buildPie(slices, size = 200) {
  if (!slices.length) return "";
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total === 0) return "";

  const cx = size / 2, cy = size / 2, r = size / 2 - 10;

  // Single slice = full circle
  if (slices.length === 1) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="${slices[0].color}" opacity="0.9"/></svg>`;
  }

  let paths = "";
  let angle = -Math.PI / 2;

  slices.forEach(slice => {
    const pct = slice.value / total;
    const a1 = angle;
    const a2 = angle + pct * 2 * Math.PI;
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
    const large = pct > 0.5 ? 1 : 0;
    paths += `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z" fill="${slice.color}" opacity="0.9"/>`;
    angle = a2;
  });

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${paths}</svg>`;
}

// Build SVG bar chart for monthly data
function buildBars(months) {
  const cols = months.length;
  const w = Math.max(480, cols * 44), h = 160, pad = 20;
  const maxVal = Math.max(...months.flatMap(m => [m.income, m.expense]), 1);
  const barW = Math.min(14, Math.floor((w - pad * 2) / cols / 2 - 2));
  const gap = (w - pad * 2) / cols;

  let bars = "";
  months.forEach((m, i) => {
    const x = pad + i * gap + gap / 2;
    const incH = (m.income / maxVal) * (h - 30);
    const expH = (m.expense / maxVal) * (h - 30);
    bars += `<rect x="${x - barW - 1}" y="${h - 20 - incH}" width="${barW}" height="${incH}" fill="#22d3a5" rx="3" opacity="0.85"/>`;
    bars += `<rect x="${x + 1}" y="${h - 20 - expH}" width="${barW}" height="${expH}" fill="#f472b6" rx="3" opacity="0.85"/>`;
    bars += `<text x="${x}" y="${h - 4}" text-anchor="middle" font-size="9" fill="#8b9dc3">${m.short}</text>`;
  });

  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="width:100%;max-width:${w}px">${bars}</svg>`;
}

export function exportHTMLReport({ transactions, categories, profile, cycleDay = 1, selectedMonth = null }) {
  const p1Name = profile?.personOneName ?? "אלעד";
  const p2Name = profile?.personTwoName ?? "נויה";

  // Filter to selected month if provided
  const txList = selectedMonth
    ? transactions.filter(tx => getCycleLabel(tx.date, cycleDay) === selectedMonth)
    : transactions;

  const income  = txList.filter(t => t.type === "income") .reduce((s, t) => s + Number(t.amount), 0);
  const expense = txList.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const balance = income - expense;

  // Category breakdown
  const catMap = {};
  txList.filter(t => t.type === "expense").forEach(t => {
    catMap[t.category] = (catMap[t.category] ?? 0) + Number(t.amount);
  });
  const catSlices = Object.entries(catMap)
    .map(([id, value]) => ({ id, value, label: catLabel(id, categories), emoji: catEmoji(id, categories) }))
    .sort((a, b) => b.value - a.value);

  const PIE_COLORS = ["#6366f1","#f472b6","#22d3a5","#fbbf24","#38bdf8","#a78bfa","#fb7185","#34d399","#f97316","#60a5fa","#e879f9","#4ade80"];
  const slicesWithColor = catSlices.map((s, i) => ({ ...s, color: PIE_COLORS[i % PIE_COLORS.length] }));

  // Monthly data — 12 months for full report, 6 for monthly
  const monthCount = selectedMonth ? 6 : 12;
  const monthlyData = [];
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(cycleDay);
    d.setMonth(d.getMonth() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(cycleDay).padStart(2, "0")}`;
    const label = getCycleLabel(dateStr, cycleDay);
    const short = label.split("–")[0].split(" ")[0].slice(0, 3);
    const mTx = transactions.filter(tx => getCycleLabel(tx.date, cycleDay) === label);
    monthlyData.push({
      label, short,
      income:  mTx.filter(t => t.type === "income") .reduce((s, t) => s + Number(t.amount), 0),
      expense: mTx.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0),
    });
  }

  const pie = buildPie(slicesWithColor);
  const bars = buildBars(monthlyData);

  // Person breakdown
  const p1Expense = txList.filter(t => t.type === "expense" && (t.person === "personOne" || t.person === "both")).reduce((s, t) => s + Number(t.amount), 0);
  const p2Expense = txList.filter(t => t.type === "expense" && (t.person === "personTwo" || t.person === "both")).reduce((s, t) => s + Number(t.amount), 0);

  // Rows table
  const tableRows = txList
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(tx => `
      <tr>
        <td>${tx.date.split("-").reverse().join("/")}</td>
        <td>${tx.type === "income" ? "הכנסה" : "הוצאה"}</td>
        <td>${catEmoji(tx.category, categories)} ${catLabel(tx.category, categories)}</td>
        <td style="color:${tx.type === "income" ? "#22d3a5" : "#f472b6"};font-weight:700">${tx.type === "income" ? "+" : "-"}${fmt(tx.amount)}</td>
        <td>${personLabel(tx.person, p1Name, p2Name)}</td>
        <td>${tx.paymentMethod ?? ""}</td>
        <td>${tx.description ?? ""}</td>
      </tr>`).join("");

  const legendItems = slicesWithColor.map(s =>
    `<div class="legend-item"><span class="dot" style="background:${s.color}"></span>${s.emoji} ${s.label} — ${fmt(s.value)} (${expense > 0 ? Math.round(s.value / expense * 100) : 0}%)</div>`
  ).join("");

  const monthRows = monthlyData.map(m => `
    <tr>
      <td>${m.label}</td>
      <td style="color:#22d3a5">${fmt(m.income)}</td>
      <td style="color:#f472b6">${fmt(m.expense)}</td>
      <td style="color:${m.income - m.expense >= 0 ? "#22d3a5" : "#f472b6"}">${fmt(m.income - m.expense)}</td>
    </tr>`).join("");

  const title = selectedMonth ? `דוח ${selectedMonth}` : "דוח כולל";
  const generatedDate = new Date().toLocaleDateString("he-IL");

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #0d1117; color: #f0f4ff; padding: 24px; direction: rtl; }
  h1 { font-size: 28px; font-weight: 900; margin-bottom: 4px; }
  h2 { font-size: 18px; font-weight: 700; color: #a5b4fc; margin-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 8px; }
  .subtitle { color: #8b9dc3; font-size: 13px; margin-bottom: 32px; }
  .section { background: #161b27; border-radius: 20px; padding: 20px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.05); }
  .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 0; }
  .card { background: #1e2535; border-radius: 14px; padding: 16px; text-align: center; }
  .card .val { font-size: 26px; font-weight: 900; letter-spacing: -1px; }
  .card .lbl { font-size: 12px; color: #8b9dc3; margin-top: 4px; }
  .green { color: #22d3a5; }
  .pink  { color: #f472b6; }
  .chart-row { display: flex; gap: 24px; align-items: flex-start; flex-wrap: wrap; }
  .legend { display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 180px; }
  .legend-item { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #c7d2e8; }
  .dot { width: 12px; height: 12px; border-radius: 3px; flex-shrink: 0; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #1e2535; padding: 10px 12px; text-align: right; color: #8b9dc3; font-weight: 600; }
  td { padding: 9px 12px; border-bottom: 1px solid rgba(255,255,255,0.04); color: #c7d2e8; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: rgba(99,102,241,0.05); }
  .person-row { display: flex; gap: 14px; }
  .person-card { flex: 1; background: #1e2535; border-radius: 14px; padding: 14px 16px; }
  .person-card .name { font-weight: 700; font-size: 15px; margin-bottom: 4px; }
  .person-card .amount { font-size: 20px; font-weight: 800; color: #f472b6; }
  .insight { background: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.2); border-radius: 12px; padding: 14px 16px; font-size: 14px; color: #c7d2e8; line-height: 1.7; }
  .insight strong { color: #a5b4fc; }
  @media print { body { background: white; color: black; } .card, .section { background: #f8f9fa; border: 1px solid #ddd; } }
</style>
</head>
<body>
<h1>📊 ${title}</h1>
<div class="subtitle">נוצר ב-${generatedDate} · ${p1Name} ו-${p2Name}</div>

<div class="section">
  <h2>סיכום ${selectedMonth ?? "כולל"}</h2>  <div class="summary-grid">
    <div class="card"><div class="val green">${fmt(income)}</div><div class="lbl">📈 הכנסות</div></div>
    <div class="card"><div class="val pink">${fmt(expense)}</div><div class="lbl">📉 הוצאות</div></div>
    <div class="card"><div class="val" style="color:${balance >= 0 ? "#22d3a5" : "#f472b6"}">${balance >= 0 ? "+" : ""}${fmt(balance)}</div><div class="lbl">${balance >= 0 ? "✨" : "⚠️"} מאזן</div></div>
  </div>
</div>

${slicesWithColor.length > 0 ? `
<div class="section">
  <h2>פירוט הוצאות לפי קטגוריה</h2>
  <div class="chart-row">
    <div>${pie}</div>
    <div class="legend">${legendItems}</div>
  </div>
</div>` : ""}

${!selectedMonth ? `
<div class="section">
  <h2>12 חודשים אחרונים</h2>
  ${bars}
  <table style="margin-top:16px">
    <tr><th>חודש</th><th>הכנסות</th><th>הוצאות</th><th>מאזן</th></tr>
    ${monthRows}
  </table>
</div>` : ""}

<div class="section">
  <h2>פירוט לפי אדם</h2>
  <div class="person-row">
    <div class="person-card"><div class="name">🙋🏽 ${p1Name}</div><div class="amount">${fmt(p1Expense)}</div><div class="lbl">הוצאות</div></div>
    <div class="person-card"><div class="name">🙋🏽‍♀️ ${p2Name}</div><div class="amount">${fmt(p2Expense)}</div><div class="lbl">הוצאות</div></div>
  </div>
</div>

${txList.length > 0 ? `
<div class="section">
  <h2>💡 תובנות</h2>
  <div class="insight">
    ${slicesWithColor[0] ? `• ההוצאה הגדולה ביותר היא <strong>${slicesWithColor[0].emoji} ${slicesWithColor[0].label}</strong> — ${fmt(slicesWithColor[0].value)} (${expense > 0 ? Math.round(slicesWithColor[0].value / expense * 100) : 0}% מסך ההוצאות)<br>` : ""}
    ${balance < 0 ? `• <strong>⚠️ גירעון של ${fmt(Math.abs(balance))}</strong> — ההוצאות עולות על ההכנסות<br>` : `• <strong>✅ חיסכון של ${fmt(balance)}</strong> החודש — כל הכבוד!<br>`}
    ${income > 0 ? `• שיעור חיסכון: <strong>${Math.round((balance / income) * 100)}%</strong> מההכנסות<br>` : ""}
    ${profile.personOneMonthlyIncome || profile.personTwoMonthlyIncome ? `• מעשרות (10% מהכנסה צפויה): <strong>${fmt(((Number(profile.personOneMonthlyIncome) || 0) + (Number(profile.personTwoMonthlyIncome) || 0)) * 0.1)}</strong>` : ""}
  </div>
</div>` : ""}

<div class="section">
  <h2>כל העסקאות</h2>
  <table>
    <tr><th>תאריך</th><th>סוג</th><th>קטגוריה</th><th>סכום</th><th>של מי</th><th>תשלום</th><th>תיאור</th></tr>
    ${tableRows}
  </table>
</div>

</body></html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, "_blank");
  if (win) {
    win.onload = () => {
      setTimeout(() => { win.print(); URL.revokeObjectURL(url); }, 400);
    };
  }
}

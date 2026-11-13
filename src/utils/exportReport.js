import { getCycleLabel } from "./monthUtils";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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

function buildPie(slices, size = 200) {
  if (!slices.length) return "";
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total === 0) return "";
  const cx = size / 2, cy = size / 2, r = size / 2 - 10;
  if (slices.length === 1) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="${slices[0].color}" opacity="0.9"/></svg>`;
  }
  let paths = "";
  let angle = -Math.PI / 2;
  slices.forEach(slice => {
    const pct = slice.value / total;
    const a1 = angle, a2 = angle + pct * 2 * Math.PI;
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
    const large = pct > 0.5 ? 1 : 0;
    paths += `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z" fill="${slice.color}" opacity="0.9"/>`;
    angle = a2;
  });
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${paths}</svg>`;
}

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

function buildHTML({ transactions, categories, profile, cycleDay, selectedMonth }) {
  const p1Name = profile?.personOneName ?? "אלעד";
  const p2Name = profile?.personTwoName ?? "נויה";

  const txList = selectedMonth
    ? transactions.filter(tx => getCycleLabel(tx.date, cycleDay) === selectedMonth)
    : transactions;

  const income  = txList.filter(t => t.type === "income") .reduce((s, t) => s + Number(t.amount), 0);
  const expense = txList.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const balance = income - expense;

  const catMap = {};
  txList.filter(t => t.type === "expense").forEach(t => {
    catMap[t.category] = (catMap[t.category] ?? 0) + Number(t.amount);
  });
  const catSlices = Object.entries(catMap)
    .map(([id, value]) => ({ id, value, label: catLabel(id, categories), emoji: catEmoji(id, categories) }))
    .sort((a, b) => b.value - a.value);

  const PIE_COLORS = ["#6366f1","#f472b6","#22d3a5","#fbbf24","#38bdf8","#a78bfa","#fb7185","#34d399","#f97316","#60a5fa","#e879f9","#4ade80"];
  const slicesWithColor = catSlices.map((s, i) => ({ ...s, color: PIE_COLORS[i % PIE_COLORS.length] }));

  const monthCount = selectedMonth ? 6 : 12;
  const monthlyData = [];
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(cycleDay);
    d.setMonth(d.getMonth() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(cycleDay).padStart(2, "0")}`;
    const label = getCycleLabel(dateStr, cycleDay);
    const short = label.split(" ")[0].slice(0, 3);
    const mTx = transactions.filter(tx => getCycleLabel(tx.date, cycleDay) === label);
    monthlyData.push({
      label, short,
      income:  mTx.filter(t => t.type === "income") .reduce((s, t) => s + Number(t.amount), 0),
      expense: mTx.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0),
    });
  }

  const pie  = buildPie(slicesWithColor);
  const bars = buildBars(monthlyData);

  const p1Expense = txList.filter(t => t.type === "expense" && (t.person === "personOne" || t.person === "both")).reduce((s, t) => s + Number(t.amount), 0);
  const p2Expense = txList.filter(t => t.type === "expense" && (t.person === "personTwo" || t.person === "both")).reduce((s, t) => s + Number(t.amount), 0);

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

  return { title, html: `
<div style="font-family:'Segoe UI',Arial,sans-serif;background:#0d1117;color:#f0f4ff;padding:32px;direction:rtl;width:900px;">
  <h1 style="font-size:28px;font-weight:900;margin:0 0 4px">📊 ${title}</h1>
  <div style="color:#8b9dc3;font-size:13px;margin-bottom:28px">נוצר ב-${generatedDate} · ${p1Name} ו-${p2Name}</div>

  <div style="background:#161b27;border-radius:16px;padding:20px;margin-bottom:16px;border:1px solid rgba(255,255,255,0.05)">
    <h2 style="font-size:16px;font-weight:700;color:#a5b4fc;margin:0 0 14px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:8px">סיכום ${selectedMonth ?? "כולל"}</h2>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
      <div style="background:#1e2535;border-radius:12px;padding:14px;text-align:center"><div style="font-size:24px;font-weight:900;color:#22d3a5">${fmt(income)}</div><div style="font-size:11px;color:#8b9dc3;margin-top:4px">📈 הכנסות</div></div>
      <div style="background:#1e2535;border-radius:12px;padding:14px;text-align:center"><div style="font-size:24px;font-weight:900;color:#f472b6">${fmt(expense)}</div><div style="font-size:11px;color:#8b9dc3;margin-top:4px">📉 הוצאות</div></div>
      <div style="background:#1e2535;border-radius:12px;padding:14px;text-align:center"><div style="font-size:24px;font-weight:900;color:${balance >= 0 ? "#22d3a5" : "#f472b6"}">${balance >= 0 ? "+" : ""}${fmt(balance)}</div><div style="font-size:11px;color:#8b9dc3;margin-top:4px">${balance >= 0 ? "✨" : "⚠️"} מאזן</div></div>
    </div>
  </div>

  ${slicesWithColor.length > 0 ? `
  <div style="background:#161b27;border-radius:16px;padding:20px;margin-bottom:16px;border:1px solid rgba(255,255,255,0.05)">
    <h2 style="font-size:16px;font-weight:700;color:#a5b4fc;margin:0 0 14px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:8px">פירוט הוצאות לפי קטגוריה</h2>
    <div style="display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap">
      <div>${pie}</div>
      <div style="display:flex;flex-direction:column;gap:8px;flex:1">${legendItems}</div>
    </div>
  </div>` : ""}

  ${!selectedMonth ? `
  <div style="background:#161b27;border-radius:16px;padding:20px;margin-bottom:16px;border:1px solid rgba(255,255,255,0.05)">
    <h2 style="font-size:16px;font-weight:700;color:#a5b4fc;margin:0 0 14px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:8px">12 חודשים אחרונים</h2>
    ${bars}
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:16px">
      <tr><th style="background:#1e2535;padding:8px 10px;text-align:right;color:#8b9dc3">חודש</th><th style="background:#1e2535;padding:8px 10px;text-align:right;color:#8b9dc3">הכנסות</th><th style="background:#1e2535;padding:8px 10px;text-align:right;color:#8b9dc3">הוצאות</th><th style="background:#1e2535;padding:8px 10px;text-align:right;color:#8b9dc3">מאזן</th></tr>
      ${monthRows}
    </table>
  </div>` : ""}

  <div style="background:#161b27;border-radius:16px;padding:20px;margin-bottom:16px;border:1px solid rgba(255,255,255,0.05)">
    <h2 style="font-size:16px;font-weight:700;color:#a5b4fc;margin:0 0 14px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:8px">פירוט לפי אדם</h2>
    <div style="display:flex;gap:12px">
      <div style="flex:1;background:#1e2535;border-radius:12px;padding:14px"><div style="font-weight:700;font-size:15px;margin-bottom:4px">🙋🏽 ${p1Name}</div><div style="font-size:20px;font-weight:800;color:#f472b6">${fmt(p1Expense)}</div></div>
      <div style="flex:1;background:#1e2535;border-radius:12px;padding:14px"><div style="font-weight:700;font-size:15px;margin-bottom:4px">🙋🏽‍♀️ ${p2Name}</div><div style="font-size:20px;font-weight:800;color:#f472b6">${fmt(p2Expense)}</div></div>
    </div>
  </div>

  ${txList.length > 0 ? `
  <div style="background:#161b27;border-radius:16px;padding:20px;margin-bottom:16px;border:1px solid rgba(255,255,255,0.05)">
    <h2 style="font-size:16px;font-weight:700;color:#a5b4fc;margin:0 0 14px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:8px">💡 תובנות</h2>
    <div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:12px;padding:14px;font-size:14px;color:#c7d2e8;line-height:1.8">
      ${slicesWithColor[0] ? `• ההוצאה הגדולה ביותר: <strong style="color:#a5b4fc">${slicesWithColor[0].emoji} ${slicesWithColor[0].label}</strong> — ${fmt(slicesWithColor[0].value)} (${expense > 0 ? Math.round(slicesWithColor[0].value / expense * 100) : 0}%)<br>` : ""}
      ${balance < 0 ? `• <strong style="color:#a5b4fc">⚠️ גירעון של ${fmt(Math.abs(balance))}</strong><br>` : `• <strong style="color:#a5b4fc">✅ חיסכון של ${fmt(balance)}</strong><br>`}
      ${income > 0 ? `• שיעור חיסכון: <strong style="color:#a5b4fc">${Math.round((balance / income) * 100)}%</strong><br>` : ""}
    </div>
  </div>` : ""}

  <div style="background:#161b27;border-radius:16px;padding:20px;border:1px solid rgba(255,255,255,0.05)">
    <h2 style="font-size:16px;font-weight:700;color:#a5b4fc;margin:0 0 14px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:8px">כל העסקאות</h2>
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <tr>
        <th style="background:#1e2535;padding:8px 10px;text-align:right;color:#8b9dc3">תאריך</th>
        <th style="background:#1e2535;padding:8px 10px;text-align:right;color:#8b9dc3">סוג</th>
        <th style="background:#1e2535;padding:8px 10px;text-align:right;color:#8b9dc3">קטגוריה</th>
        <th style="background:#1e2535;padding:8px 10px;text-align:right;color:#8b9dc3">סכום</th>
        <th style="background:#1e2535;padding:8px 10px;text-align:right;color:#8b9dc3">של מי</th>
        <th style="background:#1e2535;padding:8px 10px;text-align:right;color:#8b9dc3">תשלום</th>
        <th style="background:#1e2535;padding:8px 10px;text-align:right;color:#8b9dc3">תיאור</th>
      </tr>
      ${tableRows}
    </table>
  </div>
</div>` };
}

export async function exportHTMLReport({ transactions, categories, profile, cycleDay = 1, selectedMonth = null }) {
  const { title, html } = buildHTML({ transactions, categories, profile, cycleDay, selectedMonth });

  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-9999px;top:0;z-index:-1";
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container.firstElementChild, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#0d1117",
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;
    let yOffset = 0;
    let remaining = imgH;

    while (remaining > 0) {
      pdf.addImage(imgData, "PNG", 0, -yOffset, imgW, imgH);
      remaining -= pageH;
      yOffset += pageH;
      if (remaining > 0) pdf.addPage();
    }

    const fileName = selectedMonth
      ? `דוח-${selectedMonth.replace(/\s/g, "-")}.pdf`
      : "דוח-כולל.pdf";
    pdf.save(fileName);
  } finally {
    document.body.removeChild(container);
  }
}

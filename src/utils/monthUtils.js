const heFormatter = new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric" });
const heShortFormatter = new Intl.DateTimeFormat("he-IL", { month: "short" });

// Given a date string and cycle start day, return the cycle label (e.g. "ספטמבר 2026" or "ספטמבר–אוקטובר 2026")
export function getCycleLabel(dateStr, cycleDay = 1) {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDate();

  // Which cycle does this date belong to?
  // If cycleDay=10: dates 10–31 belong to "this month's cycle", dates 1–9 belong to "previous month's cycle"
  let cycleStartDate;
  if (day >= cycleDay) {
    cycleStartDate = new Date(d.getFullYear(), d.getMonth(), cycleDay);
  } else {
    cycleStartDate = new Date(d.getFullYear(), d.getMonth() - 1, cycleDay);
  }

  if (cycleDay === 1) {
    return heFormatter.format(cycleStartDate);
  }

  // Label by the month that holds the majority of the cycle.
  // A cycle runs from cycleDay of month M to (cycleDay-1) of month M+1.
  // Days from cycleDay to end-of-month M  = daysInMonth(M) - cycleDay + 1
  // Days from 1 to cycleDay-1 of month M+1 = cycleDay - 1
  // The majority month is M when daysInMonth(M) - cycleDay + 1 >= cycleDay - 1,
  // i.e. daysInMonth(M) >= 2*cycleDay - 2.  For any cycleDay <= 16 this is always true.
  // For simplicity we always use the start month as the label.
  return `${new Intl.DateTimeFormat("he-IL", { month: "long" }).format(cycleStartDate)} ${cycleStartDate.getFullYear()}`;
}

// Returns true if a transaction date belongs to the given cycle label
export function isInCycle(dateStr, cycleLabel, cycleDay = 1) {
  return getCycleLabel(dateStr, cycleDay) === cycleLabel;
}

// Build a list of cycle labels going back `count` cycles from today
export function buildCycleList(count = 12, cycleDay = 1) {
  const list = [];
  const today = new Date();
  const todayDay = today.getDate();

  // Start of current cycle
  let cycleStart;
  if (todayDay >= cycleDay) {
    cycleStart = new Date(today.getFullYear(), today.getMonth(), cycleDay);
  } else {
    cycleStart = new Date(today.getFullYear(), today.getMonth() - 1, cycleDay);
  }

  for (let i = 0; i < count; i++) {
    const d = new Date(cycleStart.getFullYear(), cycleStart.getMonth() - i, cycleDay);
    list.push(getCycleLabel(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(cycleDay).padStart(2, "0")}`,
      cycleDay
    ));
  }
  return list;
}

// Get the ISO start date of a cycle label (used for recurring virtual transactions)
export function getCycleStartIso(cycleLabel, cycleDay = 1) {
  const list = buildCycleList(24, cycleDay);
  const idx = list.indexOf(cycleLabel);
  if (idx === -1) return new Date().toISOString().slice(0, 10);

  const today = new Date();
  const todayDay = today.getDate();
  let cycleStart;
  if (todayDay >= cycleDay) {
    cycleStart = new Date(today.getFullYear(), today.getMonth(), cycleDay);
  } else {
    cycleStart = new Date(today.getFullYear(), today.getMonth() - 1, cycleDay);
  }

  const d = new Date(cycleStart.getFullYear(), cycleStart.getMonth() - idx, cycleDay);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(cycleDay).padStart(2, "0")}`;
}

// Short label for charts (e.g. "ספט")
export function getCycleShortLabel(cycleLabel) {
  const firstWord = cycleLabel.split("–")[0].trim().split(" ")[0];
  return firstWord.slice(0, 4);
}

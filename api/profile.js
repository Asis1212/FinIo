import { db } from '../db/index.js';
import { profile } from '../db/schema.js';

function json(data, status = 200) {
  return Response.json(data, { status });
}

function toClient(row) {
  return {
    personOneName:          row.personOneName,
    personTwoName:          row.personTwoName,
    currency:               row.currency,
    personOneMonthlyIncome: row.personOneMonthlyIncome ?? '0',
    personTwoMonthlyIncome: row.personTwoMonthlyIncome ?? '0',
    monthCycleDay:          row.monthCycleDay ?? 1,
  };
}

export async function GET() {
  const rows = await db.select().from(profile).limit(1);
  if (!rows.length) return json({ error: 'Not found' }, 404);
  return json(toClient(rows[0]));
}

export async function PUT(req) {
  const body = await req.json();
  await db.insert(profile).values({
    id:                     1,
    personOneName:          body.personOneName,
    personTwoName:          body.personTwoName,
    currency:               body.currency,
    personOneMonthlyIncome: String(body.personOneMonthlyIncome ?? 0),
    personTwoMonthlyIncome: String(body.personTwoMonthlyIncome ?? 0),
    monthCycleDay:          body.monthCycleDay ?? 1,
    updatedAt:              new Date(),
  }).onConflictDoUpdate({
    target: profile.id,
    set: {
      personOneName:          body.personOneName,
      personTwoName:          body.personTwoName,
      currency:               body.currency,
      personOneMonthlyIncome: String(body.personOneMonthlyIncome ?? 0),
      personTwoMonthlyIncome: String(body.personTwoMonthlyIncome ?? 0),
      monthCycleDay:          body.monthCycleDay ?? 1,
      updatedAt:              new Date(),
    },
  });
  const rows = await db.select().from(profile).limit(1);
  return json(toClient(rows[0]));
}

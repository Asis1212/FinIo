import { db } from '../db/index.js';
import { budgets } from '../db/schema.js';

function json(data, status = 200) {
  return Response.json(data, { status });
}

export async function GET() {
  const rows = await db.select().from(budgets);
  const result = {};
  for (const row of rows) result[row.categoryId] = parseFloat(row.amount);
  return json(result);
}

export async function PUT(req) {
  const body = await req.json();
  for (const [categoryId, amount] of Object.entries(body)) {
    await db.insert(budgets).values({
      categoryId,
      amount:    String(amount),
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: budgets.categoryId,
      set: { amount: String(amount), updatedAt: new Date() },
    });
  }
  return json(body);
}

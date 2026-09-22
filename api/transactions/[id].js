import { db } from '../../db/index.js';
import { transactions } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

function json(data, status = 200) {
  return Response.json(data, { status });
}

function toClient(row) {
  return {
    id:               row.id,
    type:             row.type,
    amount:           parseFloat(row.amount),
    category:         row.categoryId,
    date:             row.date,
    description:      row.description,
    person:           row.person,
    paymentMethod:    row.paymentMethod,
    recurring:        row.recurring,
    installmentId:    row.installmentId    ?? null,
    installmentIndex: row.installmentIndex ?? null,
    installmentTotal: row.installmentTotal ?? null,
  };
}

export async function PUT(req, { params }) {
  const id   = params.id;
  const body = await req.json();
  await db.update(transactions).set({
    type:             body.type,
    amount:           String(body.amount),
    categoryId:       body.category,
    date:             body.date,
    description:      body.description ?? '',
    person:           body.person ?? null,
    paymentMethod:    body.paymentMethod ?? '',
    recurring:        body.recurring ?? false,
    installmentId:    body.installmentId    ?? null,
    installmentIndex: body.installmentIndex ?? null,
    installmentTotal: body.installmentTotal ?? null,
  }).where(eq(transactions.id, id));
  return json(toClient({ ...body, categoryId: body.category }));
}

export async function DELETE(req, { params }) {
  await db.delete(transactions).where(eq(transactions.id, params.id));
  return json({ ok: true });
}

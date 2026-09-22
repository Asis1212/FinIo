import { db } from '../../db/index.js';
import { recurringTemplates } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

function json(data, status = 200) {
  return Response.json(data, { status });
}

function toClient(row) {
  return {
    id:            row.id,
    type:          row.type,
    amount:        parseFloat(row.amount),
    category:      row.categoryId,
    description:   row.description,
    person:        row.person,
    paymentMethod: row.paymentMethod,
    recurring:     true,
  };
}

function getId(req) {
  return new URL(req.url).pathname.split('/').filter(Boolean).pop();
}

export async function PUT(req) {
  const id   = getId(req);
  const body = await req.json();
  await db.update(recurringTemplates).set({
    type:          body.type,
    amount:        String(body.amount),
    categoryId:    body.category,
    description:   body.description ?? '',
    person:        body.person ?? null,
    paymentMethod: body.paymentMethod ?? '',
  }).where(eq(recurringTemplates.id, id));
  return json(toClient({ ...body, categoryId: body.category }));
}

export async function DELETE(req) {
  const id = getId(req);
  await db.delete(recurringTemplates).where(eq(recurringTemplates.id, id));
  return json({ ok: true });
}

import { db } from '../db/index.js';
import { recurringTemplates } from '../db/schema.js';
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

export default async function handler(req) {
  const id  = req.url.split('/').pop().split('?')[0];
  const hasId = id && id !== 'recurring';

  if (req.method === 'GET') {
    const rows = await db.select().from(recurringTemplates).orderBy(recurringTemplates.createdAt);
    return json(rows.map(toClient));
  }

  if (req.method === 'POST') {
    const body = await req.json();
    await db.insert(recurringTemplates).values({
      id:            body.id,
      type:          body.type,
      amount:        String(body.amount),
      categoryId:    body.category,
      description:   body.description ?? '',
      person:        body.person ?? null,
      paymentMethod: body.paymentMethod ?? '',
      createdAt:     new Date(),
    }).onConflictDoUpdate({
      target: recurringTemplates.id,
      set: {
        type:          body.type,
        amount:        String(body.amount),
        categoryId:    body.category,
        description:   body.description ?? '',
        person:        body.person ?? null,
        paymentMethod: body.paymentMethod ?? '',
      },
    });
    return json(toClient({ ...body, categoryId: body.category }), 201);
  }

  if (req.method === 'PUT' && hasId) {
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

  if (req.method === 'DELETE' && hasId) {
    await db.delete(recurringTemplates).where(eq(recurringTemplates.id, id));
    return json({ ok: true });
  }

  return json({ error: 'Method not allowed' }, 405);
}

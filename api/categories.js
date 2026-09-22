import { db } from '../db/index.js';
import { categories } from '../db/schema.js';
import { eq } from 'drizzle-orm';

function json(data, status = 200) {
  return Response.json(data, { status });
}

function toClient(row) {
  return {
    id:        row.id,
    label:     row.label,
    emoji:     row.emoji,
    type:      row.type,
    isDefault: row.isDefault,
    sortOrder: row.sortOrder,
  };
}

export default async function handler(req) {
  const url = new URL(req.url);
  const id  = url.pathname.split('/').pop();
  const hasId = id && id !== 'categories';

  if (req.method === 'GET') {
    const rows = await db.select().from(categories).orderBy(categories.sortOrder);
    return json(rows.map(toClient));
  }

  if (req.method === 'POST') {
    const body = await req.json();
    await db.insert(categories).values({
      id:        body.id,
      label:     body.label,
      emoji:     body.emoji,
      type:      body.type,
      isDefault: body.isDefault ?? false,
      sortOrder: body.sortOrder ?? 99,
    }).onConflictDoUpdate({
      target: categories.id,
      set: { label: body.label, emoji: body.emoji, type: body.type },
    });
    return json(toClient(body), 201);
  }

  if (req.method === 'PUT' && hasId) {
    const body = await req.json();
    await db.update(categories).set({
      label: body.label,
      emoji: body.emoji,
      type:  body.type,
    }).where(eq(categories.id, id));
    return json({ ...body, id });
  }

  if (req.method === 'DELETE' && hasId) {
    await db.delete(categories).where(eq(categories.id, id));
    return json({ ok: true });
  }

  return json({ error: 'Method not allowed' }, 405);
}

import { db } from '../../db/index.js';
import { categories } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

function json(data, status = 200) {
  return Response.json(data, { status });
}

export async function PUT(req, { params }) {
  const id   = params.id;
  const body = await req.json();
  await db.update(categories).set({
    label: body.label,
    emoji: body.emoji,
    type:  body.type,
  }).where(eq(categories.id, id));
  return json({ ...body, id });
}

export async function DELETE(req, { params }) {
  await db.delete(categories).where(eq(categories.id, params.id));
  return json({ ok: true });
}

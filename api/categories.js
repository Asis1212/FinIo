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

export async function GET() {
  const rows = await db.select().from(categories).orderBy(categories.sortOrder);
  return json(rows.map(toClient));
}

export async function POST(req) {
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

export async function PUT(req) {
  const id = req.url.split('/').pop().split('?')[0];
  const body = await req.json();
  await db.update(categories).set({
    label: body.label,
    emoji: body.emoji,
    type:  body.type,
  }).where(eq(categories.id, id));
  return json({ ...body, id });
}

export async function DELETE(req) {
  const id = req.url.split('/').pop().split('?')[0];
  await db.delete(categories).where(eq(categories.id, id));
  return json({ ok: true });
}

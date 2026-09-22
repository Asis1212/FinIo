-- Tables
CREATE TABLE IF NOT EXISTS "profile" (
  "id"                       integer PRIMARY KEY DEFAULT 1,
  "person_one_name"          text    NOT NULL DEFAULT 'אלעד',
  "person_two_name"          text    NOT NULL DEFAULT 'נויה',
  "currency"                 text    NOT NULL DEFAULT 'ILS',
  "person_one_monthly_income" numeric NOT NULL DEFAULT '0',
  "person_two_monthly_income" numeric NOT NULL DEFAULT '0',
  "month_cycle_day"          integer NOT NULL DEFAULT 1,
  "updated_at"               timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "categories" (
  "id"         text    PRIMARY KEY,
  "label"      text    NOT NULL,
  "emoji"      text    NOT NULL,
  "type"       text    NOT NULL,
  "is_default" boolean NOT NULL DEFAULT false,
  "sort_order" integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "budgets" (
  "category_id" text    PRIMARY KEY REFERENCES categories(id) ON DELETE CASCADE,
  "amount"      numeric NOT NULL,
  "updated_at"  timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "recurring_templates" (
  "id"             text PRIMARY KEY,
  "type"           text    NOT NULL,
  "amount"         numeric NOT NULL,
  "category_id"    text    REFERENCES categories(id) ON DELETE SET NULL,
  "description"    text    NOT NULL DEFAULT '',
  "person"         text,
  "payment_method" text    NOT NULL DEFAULT '',
  "created_at"     timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "transactions" (
  "id"                text    PRIMARY KEY,
  "type"              text    NOT NULL,
  "amount"            numeric NOT NULL,
  "category_id"       text    REFERENCES categories(id) ON DELETE SET NULL,
  "date"              text    NOT NULL,
  "description"       text    NOT NULL DEFAULT '',
  "person"            text,
  "payment_method"    text    NOT NULL DEFAULT '',
  "recurring"         boolean NOT NULL DEFAULT false,
  "installment_id"    text,
  "installment_index" integer,
  "installment_total" integer,
  "created_at"        timestamp NOT NULL DEFAULT now()
);

-- Seed data
INSERT INTO "profile" ("id","person_one_name","person_two_name","currency","person_one_monthly_income","person_two_monthly_income","month_cycle_day","updated_at")
VALUES (1,'אלעד','נויה','ILS','0','0',1,now())
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "categories" ("id","label","emoji","type","is_default","sort_order") VALUES
  ('salary',        'משכורת',      '💼', 'income',  true, 0),
  ('present',       'מתנה',         '🎁', 'income',  true, 1),
  ('other_in',      'אחר',          '➕', 'income',  true, 2),
  ('food',          'מזון וקניות',  '🛒', 'expense', true, 3),
  ('housing',       'דיור ושכירות', '🏠', 'expense', true, 4),
  ('transport',     'דלק ותחבורה', '🚗', 'expense', true, 5),
  ('education',     'לימודים',      '📚', 'expense', true, 6),
  ('technology',    'טכנולוגיה',    '🤖', 'expense', true, 7),
  ('entertainment', 'בילויים',      '🎉', 'expense', true, 8),
  ('pharmacy',      'פארם',         '🏥', 'expense', true, 9),
  ('health',        'בריאות',       '💊', 'expense', true, 10),
  ('shopping',      'שופינג',       '🛍️', 'expense', true, 11),
  ('subscription',  'מנויים',       '🔔', 'expense', true, 12),
  ('gym',           'חדר-כושר',     '🏋', 'expense', true, 13),
  ('events',        'אירועים',      '💍', 'expense', true, 14),
  ('savings',       'חיסכון',       '🐷', 'expense', true, 15),
  ('other_ex',      'אחר',          '📦', 'expense', true, 16)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "budgets" ("category_id","amount","updated_at") VALUES
  ('food',          '500', now()),
  ('housing',       '500', now()),
  ('transport',     '500', now()),
  ('education',     '500', now()),
  ('technology',    '500', now()),
  ('entertainment', '500', now()),
  ('pharmacy',      '500', now()),
  ('health',        '500', now()),
  ('shopping',      '500', now()),
  ('subscription',  '500', now()),
  ('gym',           '500', now()),
  ('events',        '500', now()),
  ('savings',       '500', now()),
  ('other_ex',      '500', now())
ON CONFLICT ("category_id") DO NOTHING;

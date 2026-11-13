import { pgTable, text, numeric, boolean, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const profile = pgTable('profile', {
  id:                     integer('id').primaryKey().default(1),
  personOneName:          text('person_one_name').notNull().default('אלעד'),
  personTwoName:          text('person_two_name').notNull().default('נויה'),
  currency:               text('currency').notNull().default('ILS'),
  personOneMonthlyIncome: numeric('person_one_monthly_income').notNull().default('0'),
  personTwoMonthlyIncome: numeric('person_two_monthly_income').notNull().default('0'),
  monthCycleDay:          integer('month_cycle_day').notNull().default(1),
  utilities:              jsonb('utilities'),
  updatedAt:              timestamp('updated_at').notNull().defaultNow(),
});

export const categories = pgTable('categories', {
  id:        text('id').primaryKey(),
  label:     text('label').notNull(),
  emoji:     text('emoji').notNull(),
  type:      text('type').notNull(), // 'income' | 'expense'
  isDefault: boolean('is_default').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const budgets = pgTable('budgets', {
  categoryId: text('category_id').primaryKey().references(() => categories.id, { onDelete: 'cascade' }),
  amount:     numeric('amount').notNull(),
  updatedAt:  timestamp('updated_at').notNull().defaultNow(),
});

export const transactions = pgTable('transactions', {
  id:               text('id').primaryKey(),
  type:             text('type').notNull(), // 'income' | 'expense'
  amount:           numeric('amount').notNull(),
  categoryId:       text('category_id').references(() => categories.id, { onDelete: 'set null' }),
  date:             text('date').notNull(),
  description:      text('description').notNull().default(''),
  person:           text('person'), // 'personOne' | 'personTwo' | 'both'
  paymentMethod:    text('payment_method').notNull().default(''),
  recurring:        boolean('recurring').notNull().default(false),
  installmentId:    text('installment_id'),    // shared UUID for all payments in a split
  installmentIndex: integer('installment_index'), // 1-based: 1, 2, 3...
  installmentTotal: integer('installment_total'), // total number of payments
  createdAt:        timestamp('created_at').notNull().defaultNow(),
});

export const recurringTemplates = pgTable('recurring_templates', {
  id:            text('id').primaryKey(),
  type:          text('type').notNull(),
  amount:        numeric('amount').notNull(),
  categoryId:    text('category_id').references(() => categories.id, { onDelete: 'set null' }),
  description:   text('description').notNull().default(''),
  person:        text('person'),
  paymentMethod: text('payment_method').notNull().default(''),
  createdAt:     timestamp('created_at').notNull().defaultNow(),
});

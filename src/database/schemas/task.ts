import {relations} from 'drizzle-orm';
import {date, pgTable, uuid, varchar} from 'drizzle-orm/pg-core';

import {categoryTable} from './category';
import {createdAt, id, updatedAt} from './helper';
import {timestampMap} from './timestampMap';

export const taskTable = pgTable('tasks', {
  id,
  categoryId: uuid('category_id').notNull().references(() => categoryTable.id, {
    onDelete: 'cascade'
  }),
  title: varchar('title', {length: 256}).notNull(),
  description: varchar('description'),
  location: varchar('location'),
  dueDate: date('due_date'),
  createdAt,
  updatedAt,
});

export const taskRelations =
    relations(taskTable, ({one}) => ({
                           category: one(categoryTable, {
                             fields: [taskTable.categoryId],
                             references: [categoryTable.id],
                           }),
                           timestamps: one(timestampMap),
                         }));

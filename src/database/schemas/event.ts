import { pgTable, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./helper";
import { varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { date } from "drizzle-orm/pg-core";
import { categoryTable } from "./category";
import { timestampMap } from "./timestampMap";

export const eventTable = pgTable("events", {
  id,
  categoryId: uuid("category_id")
    .notNull()
    .references(() => categoryTable.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 256 }).notNull(),
  description: varchar("description"),
  location: varchar("location"),
  dueDate: date("due_date"),
  createdAt,
  updatedAt,
});

export const eventRelations = relations(eventTable, ({ one, many }) => ({
  category: one(categoryTable, {
    fields: [eventTable.categoryId],
    references: [categoryTable.id],
  }),
  timestamps: many(timestampMap),
}));

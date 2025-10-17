import { pgTable, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./helper";
import { varchar } from "drizzle-orm/pg-core";
import { boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { calendarTable } from "./calendar";
import { taskTable } from "./task";
import { eventTable } from "./event";

export const categoryTable = pgTable("categories", {
  id,
  calendarId: uuid("calendarId").notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  enabled: boolean("enabled").notNull(),
  createdAt,
  updatedAt,
});

export const categoryRelations = relations(categoryTable, ({ one, many }) => ({
  calendar: one(calendarTable, {
    fields: [categoryTable.calendarId],
    references: [calendarTable.id],
  }),

  tasks: many(taskTable),
  events: many(eventTable),
}));

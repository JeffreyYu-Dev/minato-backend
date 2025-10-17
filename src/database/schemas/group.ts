import { pgTable } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./helper";
import { varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { calendarTable } from "./calendar";
import { uuid } from "drizzle-orm/pg-core";
import { memberTable } from "./member";

export const groupTable = pgTable("groups", {
  id,
  calendar_id: uuid("calendar_id").notNull(),
  code: varchar("code", { length: 8 }),
  createdAt,
  updatedAt,
});

export const groupRelations = relations(groupTable, ({ one, many }) => ({
  calendar: one(calendarTable, {
    fields: [groupTable.calendar_id],
    references: [calendarTable.id],
  }),
  members: many(memberTable),
}));

import { pgTable, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./helper";
import { varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { userTable } from "./user";
import { groupTable } from "./group";
import { categoryTable } from "./category";

export const calendarTable = pgTable("calendars", {
  id,
  owner: uuid("owner").notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  createdAt,
  updatedAt,
});

export const calendarRelations = relations(calendarTable, ({ one, many }) => ({
  owner: one(userTable, {
    fields: [calendarTable.owner],
    references: [userTable.id],
  }),
  group: one(groupTable),
  categories: many(categoryTable),
}));

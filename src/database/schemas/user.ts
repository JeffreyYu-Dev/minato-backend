import { pgTable } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./helper";
import { varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { calendarTable } from "./calendar";
import { recoveryCodeTable } from "./recovery-codes";
import { memberTable } from "./member";

// TODO: CASCASESDE on delete for related tables
export const userTable = pgTable("users", {
  id,
  //   email: varchar("email", { length: 256 }).notNull().unique(),
  username: varchar("username", { length: 256 }).notNull(),
  password: varchar("password", { length: 512 }).notNull(),
  firstName: varchar("first_name", { length: 256 }).notNull(),
  lastName: varchar("last_name", { length: 256 }).notNull(),
  createdAt,
  updatedAt,
});

// a user can have multiple calendars
export const userRelations = relations(userTable, ({ many, one }) => ({
  calendars: many(calendarTable),
  recoveryCodes: many(recoveryCodeTable),
  member: one(memberTable),
}));

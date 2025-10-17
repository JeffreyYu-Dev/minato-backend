import { pgTable } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./helper";
import { date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const timestampTable = pgTable("timestamps", {
  id,
  start: date("start").notNull(),
  end: date("end").notNull(),
  createdAt,
  updatedAt,
});

export const timestampRelations = relations(
  timestampTable,
  ({ one, many }) => ({
    event: many(timestampTable),
    task: one(timestampTable),
  })
);

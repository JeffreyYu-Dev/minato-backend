import { relations } from "drizzle-orm";
import { date, pgTable, timestamp } from "drizzle-orm/pg-core";

import { createdAt, id, updatedAt } from "./helper";
import { timestampMap } from "./timestampMap";

export const timestampTable = pgTable("timestamps", {
  id,
  start: timestamp("start").notNull(),
  end: timestamp("end").notNull(),
  createdAt,
  updatedAt,
});

export const timestampRelations = relations(
  timestampTable,
  ({ one, many }) => ({
    event: many(timestampMap),
    task: one(timestampMap),
  })
);

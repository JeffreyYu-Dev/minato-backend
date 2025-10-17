import { pgTable, uuid } from "drizzle-orm/pg-core";
import { createdAt, updatedAt } from "./helper";
import { relations } from "drizzle-orm";
import { primaryKey } from "drizzle-orm/pg-core";
import { eventTable } from "./event";
import { taskTable } from "./task";
import { timestampTable } from "./timestamp";

export const timestampMap = pgTable(
  "timestamp_map",
  {
    id: uuid("id"),
    timestampId: uuid("timestamp_id"),
    createdAt,
    updatedAt,
  },
  (table) => [primaryKey({ columns: [table.id, table.timestampId] })]
);

export const timestampMapRelations = relations(timestampMap, ({ one }) => ({
  event: one(eventTable, {
    fields: [timestampMap.id],
    references: [eventTable.id],
  }),
  task: one(taskTable, {
    fields: [timestampMap.id],
    references: [taskTable.id],
  }),
  timestamp: one(timestampTable, {
    fields: [timestampMap.timestampId],
    references: [timestampTable.id],
  }),
}));

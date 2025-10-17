import { pgTable, uuid } from "drizzle-orm/pg-core";
import { createdAt, updatedAt } from "./helper";
import { varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { primaryKey } from "drizzle-orm/pg-core";
import { userTable } from "./user";

export const recoveryCodeTable = pgTable(
  "recovery_codes",
  {
    userId: uuid("id"),
    code: varchar("code", { length: 12 }),
    createdAt,
    updatedAt,
  },
  (table) => [primaryKey({ columns: [table.userId, table.code] })]
);

export const recoveryCodeRelations = relations(
  recoveryCodeTable,
  ({ one }) => ({
    user: one(userTable, {
      fields: [recoveryCodeTable.userId],
      references: [userTable.id],
    }),
  })
);

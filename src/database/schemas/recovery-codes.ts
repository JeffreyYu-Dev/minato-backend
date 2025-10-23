import { pgTable, uuid, boolean } from "drizzle-orm/pg-core";
import { createdAt, updatedAt } from "./helper";
import { varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { primaryKey } from "drizzle-orm/pg-core";
import { userTable } from "./user";

export const recoveryCodeTable = pgTable(
  "recovery_codes",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 15 }).notNull(),
    used: boolean("used").default(false),
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

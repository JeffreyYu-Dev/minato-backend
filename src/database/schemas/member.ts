import { pgTable, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./helper";
import { relations } from "drizzle-orm";
import { groupTable } from "./group";
import { pgEnum } from "drizzle-orm/pg-core";
import { userTable } from "./user";

export const permissionEnum = pgEnum("permission", ["read", "full-access"]);

export const memberTable = pgTable("members", {
  id,
  groupId: uuid("group_id")
    .notNull()
    .references(() => groupTable.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull(),
  permission: permissionEnum().notNull().default("read"),
  createdAt,
  updatedAt,
});

export const memberRelations = relations(memberTable, ({ one }) => ({
  group: one(groupTable, {
    fields: [memberTable.groupId],
    references: [groupTable.id],
  }),
  user: one(userTable, {
    fields: [memberTable.userId],
    references: [userTable.id],
  }),
}));

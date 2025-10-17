// username and password to login to uwo portal will be hashed and salted

import { pgTable } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./helper";
import { varchar } from "drizzle-orm/pg-core";

export const uwoCredentialsTable = pgTable("uwo_credentials", {
  id,
  username: varchar("username", { length: 256 }).notNull(),
  password: varchar("password", { length: 512 }).notNull(),
  createdAt,
  updatedAt,
});

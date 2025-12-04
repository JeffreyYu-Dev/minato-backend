import { Hono } from "hono";
import { db } from "../../database/db";
import { recoveryCodeTable } from "../../database/schema";
import { eq } from "drizzle-orm";
const app = new Hono();

app.get("/recovery-codes", async (c) => {
  const jwtPayload = c.get("jwtPayload");

  const recoveryCodes = await db.query.recoveryCodeTable.findMany({
    where: eq(recoveryCodeTable.userId, jwtPayload.id),
  });

  if (!recoveryCodes) return c.json({ success: false, recoveryCodes: null });

  return c.json({ success: true, recoveryCodes });
});

export default app;

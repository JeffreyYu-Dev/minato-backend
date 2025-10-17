import { Hono } from "hono";
import { db } from "../../database/db";
import { eq } from "drizzle-orm";
import { calendarTable, userTable } from "../../database/schema";
import { validateRegisterCredentials } from "../../utils/validation-register-credentials";
import hashPassword from "../../utils/hash-password";
import { validateLoginCredentials } from "../../utils/validation-login-credentials";
import { verifyPassword } from "../../utils/verify-password";
import { createTokens, TokenPayload } from "../../utils/create-tokens";
import {
  addRefreshToken,
  invalidateRefreshToken,
  isExistingRefreshKey,
} from "../../cache/functions/jwt-tokens";
import { verifyRefreshToken } from "../../utils/verify-tokens";
import generateRecoveryCodes from "./generate-recovery-codes";

const app = new Hono();

// TODO: need to add recovery code generation
app.post("/register", async (c) => {
  try {
    const { username, password, firstName, lastName } = await c.req.json();

    if (!username || !password) {
      return c.json({ success: false, error: "Missing Fields!" }, 400);
    }
    const { success, data, error } = validateRegisterCredentials(
      username,
      password,
      firstName,
      lastName
    );

    if (!success) return c.json({ success: false, error }, 400);

    const userExists = await db.query.userTable.findFirst({
      where: eq(userTable.username, data.username),
    });

    if (userExists)
      return c.json({ success: false, error: "Username already exists!" }, 409);

    const newUser = await db
      .insert(userTable)
      .values({
        ...data,
        password: await hashPassword(data.password),
      })
      .returning({ id: userTable.id });

    //   create personal calendar

    await db.insert(calendarTable).values({
      owner: newUser[0].id,
      title: "My Calendar",
    });

    const [token, refreshToken] = await createTokens(
      newUser[0].id,
      username,
      firstName,
      lastName
    );

    await addRefreshToken(newUser[0].id, refreshToken);

    // create recovery codes
    // and store in db

    const recoveryCodes = generateRecoveryCodes();

    return c.json({
      success: true,
      token,
      refreshToken,
    });
  } catch (error) {
    return c.json({ success: false, error }, 500);
  }
});

app.post("/login", async (c) => {
  const { username, password } = await c.req.json();
  console.log(username, password);
  const {
    success,
    data: user,
    error,
  } = validateLoginCredentials(username, password);

  if (!success) return c.json({ success: false, error }, 400);

  const existingUser = await db.query.userTable.findFirst({
    where: eq(userTable.username, user.username),
  });
  if (!existingUser) {
    console.log("user not found");
    return c.json({ success: false, error: "User does not exist!" }, 404);
  }
  const verified = await verifyPassword(user.password, existingUser.password);

  if (!verified)
    return c.json({ success: false, error: "Invalid password" }, 401);

  const [token, refreshToken] = await createTokens(
    existingUser.id,
    existingUser.username,
    existingUser.firstName,
    existingUser.lastName
  );

  //   add token to redis

  await addRefreshToken(existingUser.id, refreshToken);

  return c.json({
    success: true,
    token,
    refreshToken,
  });
});

app.delete("/logout", async (c) => {
  const { refreshToken } = await c.req.json();
  try {
    if (refreshToken) {
      const token = await verifyRefreshToken(refreshToken);
      const { id } = token as unknown as TokenPayload;
      const doesExist = await isExistingRefreshKey(id, refreshToken);

      if (!doesExist) return c.json({ sucess: true }, 200);

      await invalidateRefreshToken(id, refreshToken);
    }
  } catch (error) {
    console.log("Invalid refresh token");
    return c.json({ success: false }, 200);
  }

  return c.json({ success: true }, 200);
});

app.post("/token", async (c) => {
  const { refreshToken } = await c.req.json();
  if (!refreshToken) return c.json({ error: "No Refresh token" }, 401);

  try {
    const token = await verifyRefreshToken(refreshToken);
    const { id, firstName, lastName, username } =
      token as unknown as TokenPayload;

    const doesExist = await isExistingRefreshKey(id, refreshToken);

    if (!doesExist) return c.json({ error: "INVALID REFRESH TOKEN" }, 403);

    await invalidateRefreshToken(id, refreshToken);

    const [newToken, newRefreshToken] = await createTokens(
      id,
      username,
      firstName,
      lastName
    );

    await addRefreshToken(id, newRefreshToken);

    return c.json({
      token: newToken,
      refresh: newRefreshToken,
    });
  } catch (error) {
    console.log("something went wrong", error);
    return c.json({ error: "INVALID REFRESH TOKEN" }, 403);
  }
});

export default app;

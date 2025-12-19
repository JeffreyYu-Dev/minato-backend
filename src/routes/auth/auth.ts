import { and, eq, inArray, or } from "drizzle-orm";
import { Hono } from "hono";

import {
  addRefreshToken,
  invalidateRefreshToken,
  isExistingRefreshKey,
} from "../../cache/functions/jwt-tokens";
import { db } from "../../database/db";
import {
  calendarTable,
  groupTable,
  memberTable,
  recoveryCodeTable,
  userTable,
} from "../../database/schema";
import { createTokens, TokenPayload } from "../../utils/create-tokens";
import hashPassword from "../../utils/hash-password";
import { validateLoginCredentials } from "../../utils/validation-login-credentials";
import { validateRegisterCredentials } from "../../utils/validation-register-credentials";
import { verifyPassword } from "../../utils/verify-password";
import { verifyRefreshToken } from "../../utils/verify-tokens";

import generateRecoveryCodes from "./functions/generate-recovery-codes";

const app = new Hono();

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
      colour: "#7287fd",
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

    recoveryCodes.forEach(async (code) => {
      await db.insert(recoveryCodeTable).values({
        userId: newUser[0].id,
        code,
      });
    });

    // get user list of calendars

    const calendars = await db.query.calendarTable.findMany({
      where: eq(calendarTable.owner, newUser[0].id),
      columns: {
        owner: false,
      },
      with: {
        categories: {
          with: {
            tasks: {
              with: {
                timestamps: {
                  with: {
                    timestamp: true,
                  },
                },
              },
            },
            events: {
              with: {
                timestamps: {
                  with: {
                    timestamp: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return c.json({
      success: true,
      jwt: {
        token,
        refreshToken,
      },
      session: {
        userId: newUser[0].id,
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
      },
      calendars,
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

  // Get calendar IDs from groups where user is a member
  const userMemberships = await db.query.memberTable.findMany({
    where: eq(memberTable.userId, existingUser.id),
    with: {
      group: true,
    },
  });

  const groupCalendarIds = userMemberships
    .map((membership) => membership.group?.calendar_id)
    .filter((id): id is string => id !== undefined);

  // Query calendars where user is owner OR calendar is in a group where user is a member
  const calendars = await db.query.calendarTable.findMany({
    where:
      groupCalendarIds.length > 0
        ? or(
            eq(calendarTable.owner, existingUser.id),
            inArray(calendarTable.id, groupCalendarIds)
          )
        : eq(calendarTable.owner, existingUser.id),
    with: {
      owner: {
        columns: {
          password: false,
        },
      },
      group: {
        with: {
          members: {
            with: {
              user: {
                columns: {
                  password: false,
                },
              },
            },
          },
        },
      },
      categories: {
        with: {
          tasks: {
            with: {
              timestamps: {
                with: {
                  timestamp: true,
                },
              },
            },
          },
          events: {
            with: {
              timestamps: {
                with: {
                  timestamp: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Add isOwner flag to each member in group calendars
  const calendarsWithOwnerInfo = calendars.map((calendar) => {
    if (calendar.group && calendar.group.members) {
      return {
        ...calendar,
        group: {
          ...calendar.group,
          members: calendar.group.members.map((member) => ({
            ...member,
            isOwner: member.userId === calendar.owner?.id,
          })),
        },
      };
    }
    return calendar;
  });

  // Sort calendars so "My Calendar" appears first
  const sortedCalendars = calendarsWithOwnerInfo.sort((a, b) => {
    if (a.title === "My Calendar" && b.title !== "My Calendar") return -1;
    if (a.title !== "My Calendar" && b.title === "My Calendar") return 1;
    return 0;
  });

  // Remove owner field from response (keep it only for the comparison above)
  const responseCalendars = sortedCalendars.map(({ owner, ...rest }) => rest);

  return c.json({
    success: true,
    jwt: {
      token,
      refreshToken,
    },
    session: {
      userId: existingUser.id,
      username: existingUser.username,
      firstName: existingUser.firstName,
      lastName: existingUser.lastName,
    },
    calendars: sortedCalendars,
  });
});

app.delete("/logout", async (c) => {
  const { userId, refreshToken } = c.req.query();

  //   const { refreshToken } = await c.req.json();
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
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.log("something went wrong", error);
    return c.json({ error: "INVALID REFRESH TOKEN" }, 403);
  }
});

app.get("/token/:token/valid", async (c) => {
  const { token } = c.req.param();
  try {
    const payload = await verifyRefreshToken(token);

    const { id } = payload;

    // Get calendar IDs from groups where user is a member
    const userMemberships = await db.query.memberTable.findMany({
      where: eq(memberTable.userId, id as string),
      with: {
        group: true,
      },
    });

    const groupCalendarIds = userMemberships
      .map((membership) => membership.group?.calendar_id)
      .filter((id): id is string => id !== undefined);

    // Query calendars where user is owner OR calendar is in a group where user is a member
    const calendars = await db.query.calendarTable.findMany({
      where:
        groupCalendarIds.length > 0
          ? or(
              eq(calendarTable.owner, id as string),
              inArray(calendarTable.id, groupCalendarIds)
            )
          : eq(calendarTable.owner, id as string),
      with: {
        owner: {
          columns: {
            password: false,
          },
        },
        group: {
          with: {
            members: {
              with: {
                user: {
                  columns: {
                    password: false,
                  },
                },
              },
            },
          },
        },
        categories: {
          with: {
            tasks: {
              with: {
                timestamps: {
                  with: {
                    timestamp: true,
                  },
                },
              },
            },
            events: {
              with: {
                timestamps: {
                  with: {
                    timestamp: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Add isOwner flag to each member in group calendars
    const calendarsWithOwnerInfo = calendars.map((calendar) => {
      if (calendar.group && calendar.group.members) {
        return {
          ...calendar,
          group: {
            ...calendar.group,
            members: calendar.group.members.map((member) => ({
              ...member,
              isOwner: member.userId === calendar.owner?.id,
            })),
          },
        };
      }
      return calendar;
    });

    // Sort calendars so "My Calendar" appears first
    const sortedCalendars = calendarsWithOwnerInfo.sort((a, b) => {
      if (a.title === "My Calendar" && b.title !== "My Calendar") return -1;
      if (a.title !== "My Calendar" && b.title === "My Calendar") return 1;
      return 0;
    });

    // Remove owner field from response (keep it only for the comparison above)
    const responseCalendars = sortedCalendars.map(({ owner, ...rest }) => rest);

    return c.json(
      {
        valid: true,

        session: {
          userId: payload.id,
          username: payload.username,
          firstName: payload.firstName,
          lastName: payload.lastName,
        },
        calendars: responseCalendars,
      },
      200
    );
  } catch (error) {
    return c.json({ valid: false }, 200);
  }
});
app.post("/password-recovery", async (c) => {
  try {
    const { username, recoveryCode, newPassword } = await c.req.json();

    if (!username || !recoveryCode || !newPassword) {
      return c.json({ success: false, error: "Missing fields!" }, 400);
    }

    if (!newPassword || newPassword.trim().length === 0) {
      return c.json(
        { success: false, error: "Password cannot be empty!" },
        400
      );
    }

    // Find user by username
    const user = await db.query.userTable.findFirst({
      where: eq(userTable.username, username),
    });

    if (!user) {
      return c.json({ success: false, error: "User not found!" }, 404);
    }

    // Find recovery code for this user that matches and is not used
    const recoveryCodeRecord = await db.query.recoveryCodeTable.findFirst({
      where: and(
        eq(recoveryCodeTable.userId, user.id),
        eq(recoveryCodeTable.code, recoveryCode.toUpperCase()),
        eq(recoveryCodeTable.used, false)
      ),
    });

    if (!recoveryCodeRecord) {
      return c.json(
        { success: false, error: "Invalid or already used recovery code!" },
        400
      );
    }

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user's password
    await db
      .update(userTable)
      .set({ password: hashedPassword })
      .where(eq(userTable.id, user.id));

    // Mark recovery code as used
    await db
      .update(recoveryCodeTable)
      .set({ used: true })
      .where(
        and(
          eq(recoveryCodeTable.userId, user.id),
          eq(recoveryCodeTable.code, recoveryCode.toUpperCase())
        )
      );

    return c.json({ success: true }, 200);
  } catch (error) {
    console.log("Recovery code error:", error);
    return c.json({ success: false, error: "Internal server error" }, 500);
  }
});

export default app;

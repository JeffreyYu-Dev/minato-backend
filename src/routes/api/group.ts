import { Hono } from "hono";
import { randomBytes } from "crypto";
import { and, eq, inArray, or } from "drizzle-orm";

import { db } from "../../database/db";
import {
  calendarTable,
  categoryTable,
  groupTable,
  memberTable,
} from "../../database/schema";

const app = new Hono();

// Generate a random 8-character alphanumeric code
function generateGroupCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    const randomIndex = randomBytes(1)[0] % chars.length;
    code += chars[randomIndex];
  }
  return code;
}

app.get("/", async (c) => {
  return c.text("alksdjlaksjd");
});

// create a group calendar
app.post("/", async (c) => {
  console.log("Create group calendar");
  try {
    const { title, colour } = await c.req.json();
    const payload = c.get("jwtPayload");

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return c.json(
        {
          success: false,
          error: "Title is required and must be a non-empty string!",
        },
        400
      );
    }

    const trimmedTitle = title.trim();
    const calendarColour = colour || "#7287fd";

    // Create calendar first
    const insertedCalendar = await db
      .insert(calendarTable)
      .values({
        owner: payload.id,
        title: trimmedTitle,
        colour: calendarColour,
      })
      .returning({
        id: calendarTable.id,
        title: calendarTable.title,
        colour: calendarTable.colour,
      });

    if (!insertedCalendar || insertedCalendar.length === 0) {
      return c.json(
        { success: false, error: "Failed to create calendar" },
        500
      );
    }

    const calendarId = insertedCalendar[0].id;

    // Generate a unique group code
    let groupCode = generateGroupCode();
    // Ensure code is unique (check if it exists, regenerate if needed)
    let existingGroup = await db.query.groupTable.findFirst({
      where: eq(groupTable.code, groupCode),
    });

    // Regenerate if code already exists (unlikely but possible)
    while (existingGroup) {
      groupCode = generateGroupCode();
      existingGroup = await db.query.groupTable.findFirst({
        where: eq(groupTable.code, groupCode),
      });
    }

    // Create group linked to the calendar
    const insertedGroup = await db
      .insert(groupTable)
      .values({
        calendar_id: calendarId,
        code: groupCode,
      })
      .returning({
        id: groupTable.id,
        code: groupTable.code,
        calendar_id: groupTable.calendar_id,
      });

    if (!insertedGroup || insertedGroup.length === 0) {
      return c.json({ success: false, error: "Failed to create group" }, 500);
    }

    const groupId = insertedGroup[0].id;

    // Add the owner as a member with full-access permission
    await db.insert(memberTable).values({
      groupId: groupId,
      userId: payload.id,
      permission: "full-access",
    });

    return c.json(
      {
        success: true,
        group: {
          id: insertedGroup[0].id,
          code: insertedGroup[0].code,
          calendar: insertedCalendar[0],
        },
      },
      201
    );
  } catch (error) {
    console.log("Create group calendar error:", error);
    return c.json({ success: false, error: "Internal server error" }, 500);
  }
});

// join a group by code
app.post("/join", async (c) => {
  try {
    const { code } = await c.req.json();
    const payload = c.get("jwtPayload");

    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return c.json(
        {
          success: false,
          error: "Group code is required and must be a non-empty string!",
        },
        400
      );
    }

    const trimmedCode = code.trim().toUpperCase();

    // Find the group by code
    const group = await db.query.groupTable.findFirst({
      where: eq(groupTable.code, trimmedCode),
    });

    if (!group) {
      return c.json(
        { success: false, error: "Group not found with the provided code" },
        404
      );
    }

    // Check if user is already a member
    const existingMember = await db.query.memberTable.findFirst({
      where: and(
        eq(memberTable.groupId, group.id),
        eq(memberTable.userId, payload.id)
      ),
    });

    if (existingMember) {
      return c.json(
        { success: false, error: "You are already a member of this group" },
        409
      );
    }

    // Add user as a member with 'read' permission (default)
    await db.insert(memberTable).values({
      groupId: group.id,
      userId: payload.id,
      permission: "read",
    });

    // Get calendar IDs from groups where user is a member (including the newly joined one)
    const userMemberships = await db.query.memberTable.findMany({
      where: eq(memberTable.userId, payload.id),
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
              eq(calendarTable.owner, payload.id),
              inArray(calendarTable.id, groupCalendarIds)
            )
          : eq(calendarTable.owner, payload.id),
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
        success: true,
        calendars: responseCalendars,
      },
      200
    );
  } catch (error) {
    console.log("Join group error:", error);
    return c.json({ success: false, error: "Internal server error" }, 500);
  }
});

// update a group member's permission
app.patch("/member", async (c) => {
  try {
    const { calendarId, memberId } = c.req.query();
    const { permission } = await c.req.json();
    const payload = c.get("jwtPayload");

    if (!calendarId || !memberId) {
      return c.json(
        {
          success: false,
          error: "calendarId and memberId are required as query parameters",
        },
        400
      );
    }

    if (
      !permission ||
      (permission !== "read" && permission !== "full-access")
    ) {
      return c.json(
        {
          success: false,
          error: "permission is required and must be 'read' or 'full-access'",
        },
        400
      );
    }

    // Get the calendar and verify it's a group calendar
    const calendar = await db.query.calendarTable.findFirst({
      where: eq(calendarTable.id, calendarId),
      with: {
        group: true,
      },
    });

    if (!calendar) {
      return c.json({ success: false, error: "Calendar not found" }, 404);
    }

    if (!calendar.group) {
      return c.json(
        { success: false, error: "Calendar is not a group calendar" },
        400
      );
    }

    // Check if user is the owner or has full-access permission
    const isCalendarOwner = calendar.owner === payload.id;

    let hasFullAccess = false;
    if (!isCalendarOwner) {
      const userMembership = await db.query.memberTable.findFirst({
        where: and(
          eq(memberTable.groupId, calendar.group.id),
          eq(memberTable.userId, payload.id)
        ),
      });

      hasFullAccess = userMembership?.permission === "full-access";
    }

    if (!isCalendarOwner && !hasFullAccess) {
      return c.json(
        {
          success: false,
          error: "You don't have permission to update member permissions",
        },
        403
      );
    }

    // Verify the member exists in the group (memberId is the userId)
    const member = await db.query.memberTable.findFirst({
      where: and(
        eq(memberTable.userId, memberId),
        eq(memberTable.groupId, calendar.group.id)
      ),
    });

    if (!member) {
      return c.json(
        { success: false, error: "Member not found in this group" },
        404
      );
    }

    // Update the member's permission
    const updatedMember = await db
      .update(memberTable)
      .set({ permission })
      .where(
        and(
          eq(memberTable.userId, memberId),
          eq(memberTable.groupId, calendar.group.id)
        )
      )
      .returning();

    if (!updatedMember || updatedMember.length === 0) {
      return c.json(
        { success: false, error: "Failed to update member permission" },
        500
      );
    }

    return c.json(
      {
        success: true,
        member: updatedMember[0],
      },
      200
    );
  } catch (error) {
    console.log("Update member permission error:", error);
    return c.json({ success: false, error: "Internal server error" }, 500);
  }
});

export default app;

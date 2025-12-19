import { and, eq, inArray, or } from "drizzle-orm";
import { Hono } from "hono";

import { db } from "../../database/db";
import {
  calendarTable,
  categoryTable,
  eventTable,
  groupTable,
  memberTable,
  taskTable,
  timestampMap,
  timestampTable,
} from "../../database/schema";
import isOwner from "../../utils/isOwner";

const app = new Hono();

// create a new calendar
app.post("/", async (c) => {
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

    return c.json({ success: true, calendar: insertedCalendar[0] }, 201);
  } catch (error) {
    console.log("Create calendar error:", error);
    return c.json({ success: false, error: "Internal server error" }, 500);
  }
});

// fetch calendar, task, events, members, group settings
app.get("/", async (c) => {
  const { calendarId } = c.req.query();
  const payload = c.get("jwtPayload");

  const calendar = await db.query.calendarTable.findFirst({
    where: eq(calendarTable.id, calendarId),
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

  if (!calendar)
    return c.json({ success: false, error: "Calender not found" }, 404);
  // TODO: add for group members too
  // look for owner
  if (isOwner(calendar?.owner?.id, payload.id))
    return c.json(
      { success: false, error: "User isn't authorized to get calendar" },
      401
    );

  // If this is a group calendar, add the user's permission and owner info to members
  let responseCalendar: typeof calendar & { userPermission?: string } = {
    ...calendar,
  };

  if (calendar.group && calendar.group.members) {
    // Add isOwner flag to each member
    const membersWithOwner = calendar.group.members.map((member) => ({
      ...member,
      isOwner: member.userId === calendar.owner?.id,
    }));

    responseCalendar.group = {
      ...calendar.group,
      members: membersWithOwner,
    };

    // Find the user's membership in this group
    const userMembership = await db.query.memberTable.findFirst({
      where: and(
        eq(memberTable.groupId, calendar.group.id),
        eq(memberTable.userId, payload.id)
      ),
    });

    if (userMembership) {
      responseCalendar.userPermission = userMembership.permission;
    }
  }

  return c.json(responseCalendar);
});

app.get("/category", async (c) => {
  const { calendarId, categoryId } = c.req.query();
  const payload = c.get("jwtPayload");

  const calendar = await db.query.calendarTable.findFirst({
    where: eq(calendarTable.id, calendarId),
    columns: {
      id: true,
      owner: true,
    },
    with: {
      categories: true,
      group: true,
    },
  });

  if (!calendar?.id) return c.json({ success: false });

  // Check if user is the owner
  const isCalendarOwner = isOwner(calendar.owner, payload.id);

  // If not owner, check if user is a group member with full-access
  let hasFullAccess = false;
  if (!isCalendarOwner && calendar.group) {
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
        error: "User isn't authorized to get category from calendar",
      },
      401
    );
  }

  console.log(calendar);

  //   TODO: filter for the category

  return c.text("aosidjoaijsd");
});

app.post("/category", async (c) => {
  const { calendarId } = c.req.query();
  const { title, colour } = await c.req.json();
  const payload = c.get("jwtPayload");

  // need to get the calendar then insert a new category into it
  const calendar = await db.query.calendarTable.findFirst({
    where: eq(calendarTable.id, calendarId),
    columns: {
      id: true,
      owner: true,
    },
    with: {
      group: true,
    },
  });

  if (!calendar?.id) return c.json({ success: false });

  // Check if user is the owner
  const isCalendarOwner = isOwner(calendar.owner, payload.id);

  // If not owner, check if user is a group member with full-access
  let hasFullAccess = false;
  if (!isCalendarOwner && calendar.group) {
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
      { success: false, error: "User isn't authorized to get calendar" },
      401
    );
  }

  const insertedCategory = await db
    .insert(categoryTable)
    .values({
      calendarId: calendar.id,
      title,
      enabled: true,
      colour,
    })
    .returning({
      id: categoryTable.id,
    });

  if (!insertedCategory) return c.json({ success: false });

  return c.json({ success: true, id: insertedCategory[0].id });
});

app.patch("/category", async (c) => {
  try {
    const { categoryId } = c.req.query();
    const { title, colour } = await c.req.json();
    const payload = c.get("jwtPayload");

    if (!categoryId || typeof categoryId !== "string") {
      return c.json(
        {
          success: false,
          error: "categoryId is required as a query parameter",
        },
        400
      );
    }

    // Verify category exists and user has access
    const category = await db.query.categoryTable.findFirst({
      where: eq(categoryTable.id, categoryId),
      with: {
        calendar: {
          columns: {
            id: true,
            owner: true,
          },
          with: {
            group: true,
          },
        },
      },
    });

    if (!category) {
      return c.json({ success: false, error: "Category not found" }, 404);
    }

    // Check if user is the owner
    const isCalendarOwner = isOwner(category.calendar.owner, payload.id);

    // If not owner, check if user is a group member with full-access
    let hasFullAccess = false;
    if (!isCalendarOwner && category.calendar.group) {
      const userMembership = await db.query.memberTable.findFirst({
        where: and(
          eq(memberTable.groupId, category.calendar.group.id),
          eq(memberTable.userId, payload.id)
        ),
      });

      hasFullAccess = userMembership?.permission === "full-access";
    }

    if (!isCalendarOwner && !hasFullAccess) {
      return c.json(
        {
          success: false,
          error: "User isn't authorized to update this category",
        },
        401
      );
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (title !== undefined) {
      if (typeof title === "string" && title.trim().length > 0) {
        updateData.title = title.trim();
      } else {
        return c.json(
          {
            success: false,
            error: "Title must be a non-empty string",
          },
          400
        );
      }
    }
    if (colour !== undefined) {
      if (typeof colour === "string") {
        updateData.colour = colour.trim();
      } else {
        return c.json(
          {
            success: false,
            error: "Colour must be a string",
          },
          400
        );
      }
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return c.json(
        {
          success: false,
          error: "At least one field (title or colour) must be provided",
        },
        400
      );
    }

    // Update the category
    const updatedCategory = await db
      .update(categoryTable)
      .set(updateData)
      .where(eq(categoryTable.id, categoryId))
      .returning();

    if (!updatedCategory || updatedCategory.length === 0) {
      return c.json(
        { success: false, error: "Failed to update category" },
        500
      );
    }

    return c.json(
      {
        success: true,
        category: updatedCategory[0],
      },
      200
    );
  } catch (error) {
    console.log("Update category error:", error);
    return c.json({ success: false, error: "Internal server error" }, 500);
  }
});

app.delete("/category", async (c) => {
  try {
    const { categoryId } = c.req.query();
    const payload = c.get("jwtPayload");

    if (!categoryId || typeof categoryId !== "string") {
      return c.json(
        {
          success: false,
          error: "categoryId is required as a query parameter",
        },
        400
      );
    }

    // Verify category exists and user has access
    const category = await db.query.categoryTable.findFirst({
      where: eq(categoryTable.id, categoryId),
      with: {
        calendar: {
          columns: {
            id: true,
            owner: true,
          },
          with: {
            group: true,
          },
        },
      },
    });

    if (!category) {
      return c.json({ success: false, error: "Category not found" }, 404);
    }

    // Check if user is the owner
    const isCalendarOwner = isOwner(category.calendar.owner, payload.id);

    // If not owner, check if user is a group member with full-access
    let hasFullAccess = false;
    if (!isCalendarOwner && category.calendar.group) {
      const userMembership = await db.query.memberTable.findFirst({
        where: and(
          eq(memberTable.groupId, category.calendar.group.id),
          eq(memberTable.userId, payload.id)
        ),
      });

      hasFullAccess = userMembership?.permission === "full-access";
    }

    if (!isCalendarOwner && !hasFullAccess) {
      return c.json(
        {
          success: false,
          error: "User isn't authorized to delete this category",
        },
        401
      );
    }

    // Delete the category (cascade will handle events and tasks)
    await db.delete(categoryTable).where(eq(categoryTable.id, categoryId));

    return c.json(
      {
        success: true,
        message: "Category deleted successfully",
      },
      200
    );
  } catch (error) {
    console.log("Delete category error:", error);
    return c.json({ success: false, error: "Internal server error" }, 500);
  }
});

app.get("/all", async (c) => {
  const payload = c.get("jwtPayload");

  // Get calendar IDs from groups where user is a member
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
  const allCalendars = await db.query.calendarTable.findMany({
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
  const calendarsWithOwnerInfo = allCalendars.map((calendar) => {
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

  return c.json(responseCalendars);
});

// get all tasks
app.get("/tasks", async (c) => {
  // calendar id passed through
  const calendarId = "123";

  // TODO: it's better to store the calendar in redis then check if anything has
  // changed

  await db.query.calendarTable.findMany({
    where: eq(calendarTable.id, calendarId),
    with: {
      owner: true,
      group: true,
      categories: {
        with: {
          tasks: true,
          events: {
            with: {
              timestamps: true,
            },
          },
        },
      },
    },
  });

  // fetch from database

  return c.json({ title: "oaijsdoajid" });
});

// get specific task
app.get("/tasks/:id", (c) => {
  // fetch from database

  return c.json({ title: "oaijsdoajid" });
});

// add task
app.post("/tasks", (c) => {
  const taskData = c.res.json();

  return c.json({ title: "sd" });
});

// remove task
app.delete("/tasks");

// update task
app.patch("/task");

// create event
app.post("/event", async (c) => {
  try {
    const payload = c.get("jwtPayload");
    const body = await c.req.json();
    const {
      id: eventId,
      title,
      description,
      location,
      date,
      startHour,
      endHour,
      categoryId,
      categoryName,
      dueDate,
      timestamps,
    } = body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return c.json(
        {
          success: false,
          error: "Title is required and must be a non-empty string!",
        },
        400
      );
    }

    if (!categoryId || typeof categoryId !== "string") {
      return c.json({ success: false, error: "Category ID is required!" }, 400);
    }

    // Verify user has access to the category (through calendar ownership or group membership)
    const category = await db.query.categoryTable.findFirst({
      where: eq(categoryTable.id, categoryId),
      with: {
        calendar: {
          columns: {
            id: true,
            owner: true,
          },
          with: {
            group: true,
          },
        },
      },
    });

    if (!category) {
      return c.json({ success: false, error: "Category not found" }, 404);
    }

    // Check if user is the owner
    const isCalendarOwner = isOwner(category.calendar.owner, payload.id);

    // If not owner, check if user is a group member with full-access
    let hasFullAccess = false;
    if (!isCalendarOwner && category.calendar.group) {
      const userMembership = await db.query.memberTable.findFirst({
        where: and(
          eq(memberTable.groupId, category.calendar.group.id),
          eq(memberTable.userId, payload.id)
        ),
      });

      hasFullAccess = userMembership?.permission === "full-access";
    }

    if (!isCalendarOwner && !hasFullAccess) {
      return c.json(
        {
          success: false,
          error: "User isn't authorized to create events in this category",
        },
        401
      );
    }

    // Create the event
    const eventValues: any = {
      categoryId: categoryId,
      title: title.trim(),
      description: description || null,
      location: location || null,
    };

    // Only include id if provided
    if (eventId) {
      eventValues.id = eventId;
    }

    // Handle dueDate - convert string to Date if needed, or keep as null
    if (dueDate) {
      eventValues.dueDate = typeof dueDate === "string" ? dueDate : dueDate;
    } else {
      eventValues.dueDate = null;
    }

    const insertedEvent = await db
      .insert(eventTable)
      .values(eventValues)
      .returning({
        id: eventTable.id,
      });

    if (!insertedEvent || insertedEvent.length === 0) {
      return c.json({ success: false, error: "Failed to create event" }, 500);
    }

    const newEventId = insertedEvent[0].id;

    // Handle timestamps if provided
    if (timestamps && Array.isArray(timestamps) && timestamps.length > 0) {
      for (const ts of timestamps) {
        if (ts.start && ts.end) {
          // Convert to Date objects if they're strings
          const startDate =
            typeof ts.start === "string" ? new Date(ts.start) : ts.start;
          const endDate =
            typeof ts.end === "string" ? new Date(ts.end) : ts.end;

          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            continue; // Skip invalid dates
          }

          // Check if timestamp already exists
          let existingTimestamp = await db.query.timestampTable.findFirst({
            where: and(
              eq(timestampTable.start, startDate),
              eq(timestampTable.end, endDate)
            ),
          });

          let timestampId;
          if (existingTimestamp) {
            timestampId = existingTimestamp.id;
          } else {
            // Create new timestamp - timestamp fields need Date objects
            const [newTimestamp] = await db
              .insert(timestampTable)
              .values({
                start: startDate,
                end: endDate,
              })
              .returning({ id: timestampTable.id });
            timestampId = newTimestamp?.id;
          }

          if (timestampId) {
            // Check if mapping already exists
            const existingMapping = await db.query.timestampMap.findFirst({
              where: and(
                eq(timestampMap.id, newEventId),
                eq(timestampMap.timestampId, timestampId)
              ),
            });

            if (!existingMapping) {
              await db.insert(timestampMap).values({
                id: newEventId,
                timestampId: timestampId,
              });
            }
          }
        }
      }
    } else if (date && startHour !== undefined && endHour !== undefined) {
      // Create timestamp from date, startHour, endHour
      // Assuming date is ISO format and hours are numbers
      const baseDate = typeof date === "string" ? new Date(date) : date;

      if (isNaN(baseDate.getTime())) {
        // Invalid date, skip timestamp creation
      } else {
        const startDate = new Date(baseDate);
        const endDate = new Date(baseDate);

        // Set hours (assuming startHour and endHour are 0-23 or 0-24 format)
        startDate.setHours(Number(startHour), 0, 0, 0);
        endDate.setHours(Number(endHour), 0, 0, 0);

        // Check if timestamp already exists
        let existingTimestamp = await db.query.timestampTable.findFirst({
          where: and(
            eq(timestampTable.start, startDate),
            eq(timestampTable.end, endDate)
          ),
        });

        let timestampId;
        if (existingTimestamp) {
          timestampId = existingTimestamp.id;
        } else {
          // Create new timestamp - timestamp fields need Date objects
          const [newTimestamp] = await db
            .insert(timestampTable)
            .values({
              start: startDate,
              end: endDate,
            })
            .returning({ id: timestampTable.id });
          timestampId = newTimestamp?.id;
        }

        if (timestampId) {
          // Check if mapping already exists
          const existingMapping = await db.query.timestampMap.findFirst({
            where: and(
              eq(timestampMap.id, newEventId),
              eq(timestampMap.timestampId, timestampId)
            ),
          });

          if (!existingMapping) {
            await db.insert(timestampMap).values({
              id: newEventId,
              timestampId: timestampId,
            });
          }
        }
      }
    }

    return c.json({ success: true, id: newEventId }, 201);
  } catch (error) {
    console.log("Create event error:", error);
    return c.json({ success: false, error: "Internal server error" }, 500);
  }
});

// update event
app.patch("/event", async (c) => {
  try {
    const { eventId } = c.req.query();
    const payload = c.get("jwtPayload");

    if (!eventId || typeof eventId !== "string") {
      return c.json({ success: false, error: "Event ID is required" }, 400);
    }

    const body = await c.req.json();
    const {
      title,
      description,
      location,
      date,
      startHour,
      endHour,
      categoryId,
      categoryName,
      dueDate,
      timestamps,
    } = body;

    // Verify event exists and user has access
    const event = await db.query.eventTable.findFirst({
      where: eq(eventTable.id, eventId),
      with: {
        category: {
          with: {
            calendar: {
              columns: {
                id: true,
                owner: true,
              },
              with: {
                group: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      return c.json({ success: false, error: "Event not found" }, 404);
    }

    // Check if user is the owner
    const isCalendarOwner = isOwner(event.category.calendar.owner, payload.id);

    // If not owner, check if user is a group member with full-access
    let hasFullAccess = false;
    if (!isCalendarOwner && event.category.calendar.group) {
      const userMembership = await db.query.memberTable.findFirst({
        where: and(
          eq(memberTable.groupId, event.category.calendar.group.id),
          eq(memberTable.userId, payload.id)
        ),
      });

      hasFullAccess = userMembership?.permission === "full-access";
    }

    if (!isCalendarOwner && !hasFullAccess) {
      return c.json(
        {
          success: false,
          error: "User isn't authorized to update this event",
        },
        401
      );
    }

    // Build update object
    const updateData: any = {};
    if (title !== undefined) {
      if (typeof title === "string" && title.trim().length > 0) {
        updateData.title = title.trim();
      } else if (title === null || title === "") {
        updateData.title = null;
      }
    }
    if (description !== undefined) {
      updateData.description = description || null;
    }
    if (location !== undefined) {
      updateData.location = location || null;
    }
    if (dueDate !== undefined) {
      // dueDate uses date() type which accepts strings in YYYY-MM-DD format
      updateData.dueDate = dueDate || null;
    }
    if (categoryId !== undefined && categoryId) {
      // Verify new category exists and user has access
      const newCategory = await db.query.categoryTable.findFirst({
        where: eq(categoryTable.id, categoryId),
        with: {
          calendar: {
            columns: {
              id: true,
              owner: true,
            },
            with: {
              group: true,
            },
          },
        },
      });

      if (!newCategory) {
        return c.json({ success: false, error: "Category not found" }, 404);
      }

      // Check if user is the owner
      const isNewCategoryOwner = isOwner(
        newCategory.calendar.owner,
        payload.id
      );

      // If not owner, check if user is a group member with full-access
      let hasNewCategoryFullAccess = false;
      if (!isNewCategoryOwner && newCategory.calendar.group) {
        const userMembership = await db.query.memberTable.findFirst({
          where: and(
            eq(memberTable.groupId, newCategory.calendar.group.id),
            eq(memberTable.userId, payload.id)
          ),
        });

        hasNewCategoryFullAccess = userMembership?.permission === "full-access";
      }

      if (!isNewCategoryOwner && !hasNewCategoryFullAccess) {
        return c.json(
          {
            success: false,
            error: "User isn't authorized to use this category",
          },
          401
        );
      }

      updateData.categoryId = categoryId;
    }

    // Update event
    if (Object.keys(updateData).length > 0) {
      await db
        .update(eventTable)
        .set(updateData)
        .where(eq(eventTable.id, eventId));
    }

    // Handle timestamps update
    if (timestamps !== undefined) {
      // Delete existing timestamp mappings
      await db.delete(timestampMap).where(eq(timestampMap.id, eventId));

      // Add new timestamps if provided
      if (Array.isArray(timestamps) && timestamps.length > 0) {
        for (const ts of timestamps) {
          if (ts.start && ts.end) {
            // Convert to Date objects if they're strings
            const startDate =
              typeof ts.start === "string" ? new Date(ts.start) : ts.start;
            const endDate =
              typeof ts.end === "string" ? new Date(ts.end) : ts.end;

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
              continue; // Skip invalid dates
            }

            // Check if timestamp already exists
            let existingTimestamp = await db.query.timestampTable.findFirst({
              where: and(
                eq(timestampTable.start, startDate),
                eq(timestampTable.end, endDate)
              ),
            });

            let timestampId;
            if (existingTimestamp) {
              timestampId = existingTimestamp.id;
            } else {
              // Create new timestamp - timestamp fields need Date objects
              const [newTimestamp] = await db
                .insert(timestampTable)
                .values({
                  start: startDate,
                  end: endDate,
                })
                .returning({ id: timestampTable.id });
              timestampId = newTimestamp?.id;
            }

            if (timestampId) {
              // Check if mapping already exists
              const existingMapping = await db.query.timestampMap.findFirst({
                where: and(
                  eq(timestampMap.id, eventId),
                  eq(timestampMap.timestampId, timestampId)
                ),
              });

              if (!existingMapping) {
                await db.insert(timestampMap).values({
                  id: eventId,
                  timestampId: timestampId,
                });
              }
            }
          }
        }
      } else if (date && startHour !== undefined && endHour !== undefined) {
        // Create timestamp from date, startHour, endHour
        const baseDate = typeof date === "string" ? new Date(date) : date;

        if (isNaN(baseDate.getTime())) {
          // Invalid date, skip timestamp creation
        } else {
          const startDate = new Date(baseDate);
          const endDate = new Date(baseDate);
          startDate.setHours(Number(startHour), 0, 0, 0);
          endDate.setHours(Number(endHour), 0, 0, 0);

          // Check if timestamp already exists
          let existingTimestamp = await db.query.timestampTable.findFirst({
            where: and(
              eq(timestampTable.start, startDate),
              eq(timestampTable.end, endDate)
            ),
          });

          let timestampId;
          if (existingTimestamp) {
            timestampId = existingTimestamp.id;
          } else {
            // Create new timestamp - timestamp fields need Date objects
            const [newTimestamp] = await db
              .insert(timestampTable)
              .values({
                start: startDate,
                end: endDate,
              })
              .returning({ id: timestampTable.id });
            timestampId = newTimestamp?.id;
          }

          if (timestampId) {
            // Check if mapping already exists
            const existingMapping = await db.query.timestampMap.findFirst({
              where: and(
                eq(timestampMap.id, eventId),
                eq(timestampMap.timestampId, timestampId)
              ),
            });

            if (!existingMapping) {
              await db.insert(timestampMap).values({
                id: eventId,
                timestampId: timestampId,
              });
            }
          }
        }
      }
    }

    return c.json({ success: true });
  } catch (error) {
    console.log("Update event error:", error);
    return c.json({ success: false, error: "Internal server error" }, 500);
  }
});

// delete event
app.delete("/event", async (c) => {
  try {
    const { eventId } = c.req.query();
    const payload = c.get("jwtPayload");

    if (eventId) {
      // Delete specific event
      if (typeof eventId !== "string") {
        return c.json({ success: false, error: "Invalid event ID" }, 400);
      }

      // Verify event exists and user has access
      const event = await db.query.eventTable.findFirst({
        where: eq(eventTable.id, eventId),
        with: {
          category: {
            with: {
              calendar: {
                columns: {
                  id: true,
                  owner: true,
                },
                with: {
                  group: true,
                },
              },
            },
          },
        },
      });

      if (!event) {
        return c.json({ success: false, error: "Event not found" }, 404);
      }

      // Check if user is the owner
      const isCalendarOwner = isOwner(
        event.category.calendar.owner,
        payload.id
      );

      // If not owner, check if user is a group member with full-access
      let hasFullAccess = false;
      if (!isCalendarOwner && event.category.calendar.group) {
        const userMembership = await db.query.memberTable.findFirst({
          where: and(
            eq(memberTable.groupId, event.category.calendar.group.id),
            eq(memberTable.userId, payload.id)
          ),
        });

        hasFullAccess = userMembership?.permission === "full-access";
      }

      if (!isCalendarOwner && !hasFullAccess) {
        return c.json(
          {
            success: false,
            error: "User isn't authorized to delete this event",
          },
          401
        );
      }

      // Delete event (cascade will handle timestamp mappings)
      await db.delete(eventTable).where(eq(eventTable.id, eventId));

      return c.json({ success: true });
    } else {
      // Clear all events - need calendarId to verify ownership
      const { calendarId } = c.req.query();

      if (!calendarId || typeof calendarId !== "string") {
        return c.json(
          { success: false, error: "Calendar ID is required to clear events" },
          400
        );
      }

      // Verify calendar ownership
      const calendar = await db.query.calendarTable.findFirst({
        where: eq(calendarTable.id, calendarId),
        columns: {
          id: true,
          owner: true,
        },
        with: {
          categories: {
            columns: {
              id: true,
            },
            with: {
              events: {
                columns: {
                  id: true,
                },
              },
            },
          },
          group: true,
        },
      });

      if (!calendar) {
        return c.json({ success: false, error: "Calendar not found" }, 404);
      }

      // Check if user is the owner
      const isCalendarOwner = isOwner(calendar.owner, payload.id);

      // If not owner, check if user is a group member with full-access
      let hasFullAccess = false;
      if (!isCalendarOwner && calendar.group) {
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
            error: "User isn't authorized to clear events from this calendar",
          },
          401
        );
      }

      // Delete all events in this calendar's categories
      const categoryIds = calendar.categories.map((cat) => cat.id);
      if (categoryIds.length > 0) {
        // Delete events (cascade will handle timestamp mappings)
        await db
          .delete(eventTable)
          .where(inArray(eventTable.categoryId, categoryIds));
      }

      return c.json({ success: true });
    }
  } catch (error) {
    console.log("Delete event error:", error);
    return c.json({ success: false, error: "Internal server error" }, 500);
  }
});

export default app;

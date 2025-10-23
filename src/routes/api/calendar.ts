import { Hono } from "hono";
import { db } from "../../database/db";
import { eq } from "drizzle-orm";
import { calendarTable, taskTable } from "../../database/schema";

const app = new Hono();

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
              timestamp: true,
            },
          },
          events: {
            with: {
              timestamps: true,
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
  if (calendar?.owner?.id !== payload.id)
    return c.json(
      { success: false, error: "User isn't authorized to get calendar" },
      401
    );

  return c.json(calendar);
});

app.get("/all", async (c) => {
  const payload = c.get("jwtPayload");

  const allCalendars = await db.query.calendarTable.findMany({
    where: eq(calendarTable.owner, payload.id),
    columns: {
      owner: false,
    },
    with: {
      categories: {
        with: {
          tasks: true,
          events: true,
        },
      },
    },
  });

  return c.json(allCalendars);
});

// get all tasks
app.get("/tasks", async (c) => {
  // calendar id passed through
  const calendarId = "123";

  // TODO: it's better to store the calendar in redis then check if anything has changed

  await db.query.calendarTable.findMany({
    where: eq(calendarTable.id, calendarId),
    with: {
      owner: true,
      group: true,
      categories: {
        with: {
          tasks: {
            with: {
              timestamp: true,
            },
          },
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
// add event

// remove event

// update event

export default app;

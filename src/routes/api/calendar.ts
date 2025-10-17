import { Hono } from "hono";
import { db } from "../../database/db";
import { eq } from "drizzle-orm";
import { calendarTable, taskTable } from "../../database/schema";

const app = new Hono();

// fetch calendar, task, events, members, group settings
app.get("/", async (c) => {
  const calendarId = "123";
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

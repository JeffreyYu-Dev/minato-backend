import { Hono } from "hono";
import { db } from "../../database/db";
import { eq } from "drizzle-orm";
import { calendarTable, categoryTable, taskTable } from "../../database/schema";
import isOwner from "../../utils/isOwner";

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
  if (isOwner(calendar?.owner?.id, payload.id))
    return c.json(
      { success: false, error: "User isn't authorized to get calendar" },
      401
    );

  return c.json(calendar);
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
    },
  });

  if (!calendar?.id) return c.json({ success: false });
  if (!isOwner(calendar.owner, payload.id)) {
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
  });

  if (!calendar?.id) return c.json({ success: false });
  if (!isOwner(calendar.owner, payload.id)) {
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
  const { calendarId } = c.req.query();

  const payload = c.get("jwtPayload");

  return c.json({ title: "hi" });
});

app.delete("/category", async (c) => {
  const { calendarId } = c.req.query();

  const payload = c.get("jwtPayload");
  return c.json({ title: "hi" });
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

import { Hono } from "hono";

const app = new Hono();
app.get("/test", async (c) => {
  console.log(c.get("jwtPayload"));
  return c.json({ msg: "hi" });
});

export default app;

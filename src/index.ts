import { Hono } from "hono";
import register from "./routes/auth/auth";
import { jwt } from "hono/jwt";
import { env } from "./config/env";
import test from "./routes/api/test";

const app = new Hono();

app.use(
  "/api/*",
  jwt({
    secret: env.ACCESS_TOKEN_SECRET,
  })
);

app.route("/auth", register);
app.route("/api", test);

export default {
  port: 3000,
  fetch: app.fetch,
  idleTimeout: 255,
};

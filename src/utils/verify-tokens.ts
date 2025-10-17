import { verify } from "hono/jwt";
import { env } from "../config/env";

export async function verifyToken(token: string) {
  return await verify(token, env.ACCESS_TOKEN_SECRET);
}

export async function verifyRefreshToken(token: string) {
  return await verify(token, env.REFRESH_TOKEN_SECRET);
}

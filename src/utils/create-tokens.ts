import { sign } from "hono/jwt";
import { env } from "../config/env";

export type TokenPayload = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  exp: string;
};

export async function createTokens(
  id: string,
  username: string,
  firstName: string,
  lastName: string
): Promise<[string, string]> {
  const tokenExp = Math.floor(Date.now() / 1000) + 15;
  const refreshTokenExp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;

  const user = {
    id,
    username,
    firstName,
    lastName,
  };

  return [
    await sign(
      {
        ...user,
        exp: tokenExp,
      },
      env.ACCESS_TOKEN_SECRET
    ),
    await sign(
      {
        ...user,
        exp: refreshTokenExp,
      },
      env.REFRESH_TOKEN_SECRET
    ),
  ];
}

import { redis } from "../redis";

export function refreshTokenKey(userId: string) {
  return `user:${userId}:tokens`;
}

export async function addRefreshToken(userId: string, refreshToken: string) {
  // create key
  const key = refreshTokenKey(userId);
  await redis.sadd(key, refreshToken);
}

// we don't need to get it and can just check if it's in the set
export async function getUserRefreshTokens(userId: string) {
  const key = refreshTokenKey(userId);
  const userRefreshTokens = await redis.smembers(key);

  return userRefreshTokens;
}

export async function isExistingRefreshKey(
  userId: string,
  refreshToken: string
): Promise<boolean> {
  const key = refreshTokenKey(userId);
  const isMember = await redis.sismember(key, refreshToken);

  return isMember ? true : false;
}

// remove from set
export async function invalidateRefreshToken(
  userId: string,
  refreshToken: string
) {
  const key = refreshTokenKey(userId);
  await redis.srem(key, refreshToken);
}

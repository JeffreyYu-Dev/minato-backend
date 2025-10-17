import { env } from "../config/env";

export default function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, {
    algorithm: "bcrypt",
    cost: env.SALT_ROUNDS,
  });
}

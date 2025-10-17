export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return await Bun.password.verify(password, hashedPassword, "bcrypt");
}

import { z } from "zod";

type ValidateCredentials = z.ZodSafeParseResult<{
  username: string;
  password: string;
}>;

export function validateLoginCredentials(
  username: string,
  password: string
): ValidateCredentials {
  const credentialsSchema = z.object({
    username: z.string(),
    password: z.string(),
  });

  return credentialsSchema.safeParse({
    username,
    password,
  });
}

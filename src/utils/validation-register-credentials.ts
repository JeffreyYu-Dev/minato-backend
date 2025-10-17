import { z } from "zod";

type ValidateCredentials = z.ZodSafeParseResult<{
  username: string;
  password: string;
  firstName: string;
  lastName: string;
}>;

export function validateRegisterCredentials(
  username: string,
  password: string,
  firstName: string,
  lastName: string
): ValidateCredentials {
  const credentialsSchema = z.object({
    username: z.string(),
    password: z.string(),
    firstName: z.string(),
    lastName: z.string(),
  });

  return credentialsSchema.safeParse({
    username,
    password,
    firstName,
    lastName,
  });
}

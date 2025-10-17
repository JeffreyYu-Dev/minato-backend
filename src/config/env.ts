import z from "zod";

const createEnv = () => {
  const envSchema = z.object({
    PORT: z.string().default("3000"),
    DATABASE_URL: z.string().min(1),
    ACCESS_TOKEN_SECRET: z.string().min(1),
    REFRESH_TOKEN_SECRET: z.string().min(1),
    SALT_ROUNDS: z
      .string()
      .min(1)
      .transform((val) => parseInt(val)),

    REDIS_URL: z.string().min(1),
  });

  const parsedEnv = envSchema.safeParse({
    PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL,
    ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
    SALT_ROUNDS: process.env.SALT_ROUNDS,
    REDIS_URL: process.env.REDIS_URL,
  });

  const { success, data, error } = parsedEnv;

  if (!success)
    throw new Error(`Invalid environment variables: ${error.message}`);

  //   const databaseURL = "";

  return data || {};
};

export const env = createEnv();

import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().default("postgresql://neondb_owner:npg_SYCZ0ypPV8GM@ep-old-shape-az6b16u8-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"),
  JWT_SECRET: z.string().default("default-jwt-secret-key-production-change-me"),
  PORT: z.coerce.number().int().positive().default(5000),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join(", ");
  console.error(`Invalid environment variables: ${details}`);
  process.exit(1);
}

export const env = parsed.data;

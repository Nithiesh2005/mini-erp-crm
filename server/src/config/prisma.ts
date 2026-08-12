import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_SYCZ0ypPV8GM@ep-old-shape-az6b16u8-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const adapter = new PrismaNeon({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

export default prisma;
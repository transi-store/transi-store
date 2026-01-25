import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../../drizzle/schema";
import { relations } from "../../drizzle/relations";

const getDatabaseUrl = (): string => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  return url;
};

export const db = drizzle(getDatabaseUrl(), { relations });

export { schema };

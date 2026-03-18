import { type Logger } from "drizzle-orm/logger";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../../drizzle/schema";
import { relations } from "../../drizzle/relations";
import { incrementQueryCount } from "./query-counter.server";

const getDatabaseUrl = (): string => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  return url;
};

class QueryCounterLogger implements Logger {
  logQuery(_query: string, _params: unknown[]): void {
    incrementQueryCount();
  }
}

export const db = drizzle(getDatabaseUrl(), {
  relations,
  logger: process.env.NODE_ENV !== "production" ? new QueryCounterLogger() : false,
});

export { schema };

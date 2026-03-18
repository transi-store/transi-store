import { AsyncLocalStorage } from "node:async_hooks";

type QueryCounterStore = {
  count: number;
};

const asyncLocalStorage = new AsyncLocalStorage<QueryCounterStore>();

/**
 * Increment the query counter for the current request.
 * Called by the Drizzle custom logger on each query.
 */
export function incrementQueryCount(): void {
  const store = asyncLocalStorage.getStore();
  if (store) {
    store.count++;
  }
}

/**
 * Get the current query count for the current request.
 */
export function getQueryCount(): number {
  return asyncLocalStorage.getStore()?.count ?? 0;
}

/**
 * Run a function with query counting enabled.
 * Returns the result of the function.
 */
export function withQueryCounter<T>(fn: () => T): T {
  return asyncLocalStorage.run({ count: 0 }, fn);
}

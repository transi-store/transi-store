export const PROJECT_VISIBILITY = {
  PRIVATE: "private",
  PUBLIC: "public",
} as const;

export type ProjectVisibility = (typeof PROJECT_VISIBILITY)[keyof typeof PROJECT_VISIBILITY];

export type ProjectAccessRole = "member" | "viewer";

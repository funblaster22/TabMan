export const COLORS = [
  "grey",
  "blue",
  "red",
  "yellow",
  "green",
  "pink",
  "purple",
  "cyan",
  "orange",
] as const;

export enum TAB_LEVEL {
  // Tab is grouped and is not a new tab
  REGULAR = 0,
  // Tab is grouped and is a new tab
  NEW = 1,
  // Tab is a member of its own group
  NEW_SOLO = 2,
  // Tab is not grouped
  UNGROUPED = 3,
}

export const NEWTAB_URL = "chrome://newtab/";

import {COLORS} from "./constants.js";
import {getCurrentTab} from "./tabManager.js";
import {debounce, resilientAsyncDebounceSkipper} from "./util.js";

/**
 * Returns an array of colors that are not currently in use by any tab group
 */
export async function availableColors() {
  const groups = await chrome.tabGroups.query({});
  const usedColors = new Set(groups.map(group => group.color));
  return COLORS.filter(color => !usedColors.has(color));
}

export type ProjectGroup = (TabGroup & {emoji: string, name: string}) | undefined;

export async function getGroupInfo(groupId: number): Promise<ProjectGroup> {
  if (groupId === chrome.tabGroups.TAB_GROUP_ID_NONE)
    return undefined;
  const group = await chrome.tabGroups.get(groupId);
  const [emoji, ...name] = group.title!.split(" ");
  return {
    emoji,
    name: name.join(" "),
    ...group,
  };
}

export async function getCurrentGroup() {
  const tab = await getCurrentTab();
  return getGroupInfo(tab.groupId);
}

/**
 * Only one tab group can be open at a time
 * @param group the group that was just changed (open or closed)
 */
const enforceSingleOpen = debounce(async (group: TabGroup) => {
  if (!group.collapsed) {
    const allGroups = await chrome.tabGroups.query({windowId: group.windowId});

    await Promise.all(
      allGroups
        .filter(g => g.id !== group.id && !g.collapsed)
        .map(g => chrome.tabGroups.update(g.id, {collapsed: true}))
    );

    const groupedTabs = await chrome.tabs.query({groupId: group.id});
    await chrome.tabs.update(groupedTabs[0].id!, {active: true});
  }
});

/**
 * Like-colored tab groups are adjacent
 * @param group tab group that was just moved
 */
async function reorderGroups(group: TabGroup) {
  const query = {windowId: group.windowId};
  // Must also query tabs b/c tabGroups is sorted by open time, not position
  const allTabs = await chrome.tabs.query(query);
  const allGroups = await chrome.tabGroups.query(query);
  /** Maps group id to # of tabs in that group. Starts uninitialized. Must do this b/c Chrome cannot rearrange logically (1,2,3), must pass first tab new index */
  const tabsInGroup = Object.fromEntries(allGroups.map(group => [group.id, 0]));
  /** Lookup table for group color given group id */
  const groupColors = new Map(allGroups.map(group => [group.id, group.color]));
  /** Uninitialized, ordered set or colors as they appear left to right */
  const colorOrder = new Set<ColorEnum>();
  /** Uninitialized, maps color to group ids. Ex: {blue: [#1, #3], red: [#2]} */
  const groupOrder = new Map(COLORS.map(color=> [color, new Set<number>()]));
  /** Index to start inserting groups (must be initialized to first non-pinned tab) */
  let insertionIndex = 0;
  for (const tab of allTabs) {
    // Initialize first insertion index
    if (tab.pinned) insertionIndex = tab.index + 1;

    // track group size
    tabsInGroup[tab.groupId]++;

    // track color order
    const color = groupColors.get(tab.groupId);
    if (!color) continue;
    colorOrder.add(color);

    // Track group order within color
    groupOrder.get(color)!.add(tab.groupId);
  }

  // Commit reordering
  for (const color of colorOrder) {
    /** Groups in this color */
    const groupIds = Array.from(groupOrder.get(color)!);
    for (const groupId of groupIds) {
      await chrome.tabGroups.move(groupId, {index: insertionIndex});
      insertionIndex += tabsInGroup[groupId];
    }
  }
}

/**
 * Ungrouped tabs are at the end
 * @param _tabId unused
 * @param  moveInfo contains the windowId of the moved tab
 */
export async function reorderTabs(_tabId: unknown, moveInfo: Pick<TabMoveInfo, "windowId">) {
  const ungroupedTabs = await chrome.tabs.query({
    windowId: moveInfo.windowId,
    groupId: chrome.tabGroups.TAB_GROUP_ID_NONE,
    pinned: false
  });

  if (ungroupedTabs.length > 0) {
    await Promise.all(
      ungroupedTabs.map((tab) =>
        chrome.tabs.move(tab.id!, {index: -1})
      )
    );
  }
}

// TODO: started shuffling groups when creating new split-screen window
// TODO: relaunch caused groups to come undone

chrome.tabGroups.onMoved.addListener(resilientAsyncDebounceSkipper(reorderGroups));

chrome.tabs.onMoved.addListener(resilientAsyncDebounceSkipper(reorderTabs));

chrome.tabGroups.onCreated.addListener(group => {
  enforceSingleOpen(group);
  reorderGroups(group);
})

chrome.tabGroups.onUpdated.addListener(enforceSingleOpen);

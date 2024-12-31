import {COLORS} from "./constants.js";
import {getCurrentTab} from "./tabManager.js";
import {resilientAsyncDebounceSkipper} from "./util.js";

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
async function enforceSingleOpen(group: TabGroup) {
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
}

/**
 * Like-colored tab groups are adjacent
 * @param group tab group that was just moved
 */
async function reorderGroups(group: TabGroup) {
  const query = {windowId: group.windowId};
  // Must also query tabs b/c tabGroups is sorted by open time, not position
  const allTabs = await chrome.tabs.query(query);
  const allGroups = await chrome.tabGroups.query({});
  const groupColors = new Map(allGroups.map(group => [group.id, group.color]));
  const colorOrder: Partial<Record<ColorEnum, number>> = {};
  const groupOrder: Record<string, number> = {};
  let tailIdx = 0;
  for (const tab of allTabs) {
    const color = groupColors.get(tab.groupId)!;
    if (!(color in colorOrder)) {
      colorOrder[color] = tailIdx++;
    }
    if (!(tab.groupId in groupOrder)) {
      groupOrder[tab.groupId] = tab.index;
    }
  }

  const sortedGroups = allGroups
    .toSorted((a, b) => a.color === b.color ? groupOrder[a.id] - groupOrder[b.id] : colorOrder[a.color]! - colorOrder[b.color]!);

  for (const group of sortedGroups) {
    await chrome.tabGroups.move(group.id, {index: -1});
  }

  await reorderTabs(undefined, group);
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

chrome.tabGroups.onMoved.addListener(resilientAsyncDebounceSkipper(reorderGroups));

chrome.tabs.onMoved.addListener(resilientAsyncDebounceSkipper(reorderTabs));

chrome.tabGroups.onCreated.addListener(group => {
  enforceSingleOpen(group);
  reorderGroups(group);
})

chrome.tabGroups.onUpdated.addListener(resilientAsyncDebounceSkipper(enforceSingleOpen, 1000));

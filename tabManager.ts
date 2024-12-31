import {NEWTAB_URL, TAB_LEVEL} from "./constants.js";
import {getGroupInfo, ProjectGroup} from "./tabGroupManager.js";
import {resilientAsyncDebounceSkipper} from "./util.js";

/*
- Press control T once to create a new tab in the current task
- Press control T twice to create a new task in the current project
- Press control T thrice to make uncategorized tab
- when tab detached, should create group of same name

TODO:
- focus left tab when closed
*/

export async function getCurrentTab() {
  // using windowId as opposed to currentWindow or lastFocusedWindow b/c the latter 2 ignore new tabs
  let queryOptions = {active: true, windowId: chrome.windows.WINDOW_ID_CURRENT};
  // `tab` will either be a `tabs.Tab` instance or `undefined`.
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

/** Gets the most recent active tab from session storage. */
const getLastTab = async () => {
  const storage = await chrome.storage.session.get("lastTab");
  return chrome.tabs.get(storage.lastTab);
};

/** Closes all tabs in the given list. Ignores errors
 * @return void promise once all tabs closed */
async function closeAllTabs(tabs: Tab[]) {
  await Promise.all(
    tabs.map(tab => chrome.tabs.remove(tab.id!).catch(() => {/* no-op */}))
  );
}

// This will (always?) fire after onCreated
chrome.tabs.onActivated.addListener(async ({tabId}) => {
  console.log("tab activated");
  const tab = await chrome.tabs.get(tabId);
  if ((tab.pendingUrl || tab.url) === NEWTAB_URL) return;
  await chrome.storage.session.set({lastTab: tab.id!});
  // close all new tabs that are inactive
  await closeAllTabs(await chrome.tabs.query({url: NEWTAB_URL, active: false}));
});

/**
 * Returns the level of the target tab.
 * @param allTabs all open tabs in the window
 * @param target tab to check level of
 */
function getTabLevel(allTabs: Tab[], target: Tab) {
  if (target.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE) return TAB_LEVEL.UNGROUPED;
  if ((target.pendingUrl || target.url) !== NEWTAB_URL) return TAB_LEVEL.REGULAR;
  const left = allTabs[target.index - 1];
  const right = allTabs[target.index + 1];
  if (left?.groupId === target.groupId || right?.groupId === target.groupId) return TAB_LEVEL.NEW;
  return TAB_LEVEL.NEW_SOLO;
}

chrome.tabs.onCreated.addListener(async (tab) => {
  // Get snapshot of all tabs in window
  // From testing, this always happens in order, may sometimes see the tab opened to the right of it
  const allTabs = await chrome.tabs.query({currentWindow: true});
  // Filter by new tabs (already sorted by creation order)
  const newTabs = allTabs.filter(tab => (tab.pendingUrl || tab.url) === NEWTAB_URL);
  console.log(newTabs.findIndex(tabCursor => tabCursor.id! === tab.id), newTabs);
  // Default to lastActive level
  let activeTab = await getLastTab();
  const groupInfo = await getGroupInfo(activeTab.groupId);
  let nextTabLevel = getTabLevel(allTabs, activeTab);
  // Iterate over new tabs to find lowest level (stop at newly added tab)
  for (const newTab of newTabs) {
    if (newTab.id! === tab.id!) break;
    let newTabLevel = getTabLevel(allTabs, newTab);
    if (newTabLevel === TAB_LEVEL.UNGROUPED) {
      // Change to expected level
      newTabLevel = Math.min(nextTabLevel + 1, TAB_LEVEL.UNGROUPED);
    }
    if (newTabLevel > nextTabLevel) {
      nextTabLevel = newTabLevel;
      activeTab = newTab;
    }
  }
  nextTabLevel = Math.min(nextTabLevel + 1, TAB_LEVEL.UNGROUPED);
  // Properly move tab
  await chrome.tabs.move(tab.id!, {index: activeTab.index + 1});
  // Properly group tab
  console.log("nextTabLevel", nextTabLevel, "activeTab", activeTab);
  switch (nextTabLevel) {
    case TAB_LEVEL.UNGROUPED:
      break;
    case TAB_LEVEL.REGULAR:
      throw "This should not be possible";
    case TAB_LEVEL.NEW:
      await chrome.tabs.group({tabIds: tab.id, groupId: activeTab.groupId});
      break;
    case TAB_LEVEL.NEW_SOLO:
      const newGroup = await chrome.tabs.group({tabIds: tab.id});
      // groupInfo is defined b/c activeTab was originally a regular tab (member of group)
      await chrome.tabGroups.update(newGroup, {title: groupInfo!.emoji, color: groupInfo!.color});
      // TODO: properly order. I fear `reorderTabs` will ruin order/potentially yield control in an invalid state
      break;
  }
  // Close tabs at higher levels
  await closeAllTabs(
    newTabs.filter(newTab => newTab.index < tab.index)
  );
});

const groupTabs = resilientAsyncDebounceSkipper(async (tabIds: number[] | number, groupInfo: ProjectGroup) => {
  const newGroup = await chrome.tabs.group({tabIds});
  await chrome.tabGroups.update(newGroup, {title: groupInfo!.emoji, color: groupInfo!.color});
});

chrome.tabs.onDetached.addListener(async (_tabId, {oldWindowId, oldPosition}) => {
  const allTabs = await chrome.tabs.query({windowId: oldWindowId});
  const tab = allTabs[oldPosition];
  const leftTab = allTabs[oldPosition - 1];
  // If tab is at start or end of group , cannot reliably determine membership
  if (leftTab?.groupId !== tab.groupId) return;
  const groupInfo = await getGroupInfo(tab.groupId);
  groupTabs(tab.id!, groupInfo);
});

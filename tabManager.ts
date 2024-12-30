import {NEWTAB_URL, TAB_LEVEL} from "./constants.js";
import {getGroupInfo, reorderTabs} from "./tabGroupManager.js";

/*
- Press control T once to create a new tab in the current task
- Press control T twice to create a new task in the current project
- Press control T thrice to make uncategorized tab

TODO:
- Press in context of ungrouped tab to make new group
- focus left tab when closed
- when tab detached, should create group of same name
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
}

/**
 * Returns the current tab, its group, and whether it is located in a new project, group, or loose.
 */
async function tabState() {
  const tab = await getCurrentTab();
  let level;
  const isUngrouped = tab.groupId === -1;
  if (isUngrouped) {
    level = TAB_LEVEL.UNGROUPED;
  } else if ((tab.pendingUrl || tab.url) !== NEWTAB_URL) {
    level = TAB_LEVEL.REGULAR;
  } else {
    const siblingCount = (await chrome.tabs.query({groupId: tab.groupId})).length;
    level = siblingCount > 1 ? TAB_LEVEL.NEW : TAB_LEVEL.NEW_SOLO;
  }
  return {
    tab,
    group: isUngrouped ? undefined : await chrome.tabGroups.get(tab.groupId),
    level,
  };
}

chrome.commands?.onCommand?.addListener(async (command) => {
  if (command !== "new-tab") return;

  // TODO: would this be faster if I listen to new tab events?
  const benchName = "new tab " + new Date().getMilliseconds();
  console.time(benchName);

  const state = await tabState();
  if (state.level === TAB_LEVEL.UNGROUPED || state.level === TAB_LEVEL.REGULAR) {
    state.tab = await chrome.tabs.create({url: NEWTAB_URL, index: state.tab.index + 1});
  }
  switch (state.level) {
    case TAB_LEVEL.UNGROUPED:
      break;
    case TAB_LEVEL.REGULAR:
      await chrome.tabs.group({tabIds: state.tab.id, groupId: state.group.id});
      break;
    case TAB_LEVEL.NEW:
      const newGroup = await chrome.tabs.group({tabIds: state.tab.id});
      await chrome.tabGroups.update(newGroup, {title: state.group.title, color: state.group.color});
      break;
    case TAB_LEVEL.NEW_SOLO:
      await chrome.tabs.ungroup(state.tab.id);
      await reorderTabs(undefined, state.tab);
      break;
  }
  console.timeEnd(benchName);
});

// This will (always?) fire after onCreated
chrome.tabs.onActivated.addListener(async ({tabId}) => {
  console.log("tab activated");
  const tab = await chrome.tabs.get(tabId);
  if ((tab.pendingUrl || tab.url) === NEWTAB_URL) return;
  await chrome.storage.session.set({lastTab: tab.id!});
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
  let nextTabLevel = getTabLevel(allTabs, activeTab);
  // Iterate over new tabs to find lowest level (stop at newly added tab)
  for (const newTab of newTabs) {
    const newTabLevel = getTabLevel(allTabs, newTab);
    if (newTabLevel === TAB_LEVEL.UNGROUPED) {
      nextTabLevel++;
    } else if (newTabLevel > nextTabLevel) {
      nextTabLevel = newTabLevel;
      activeTab = newTab;
    }
    if (newTab.id! === tab.id!) break;
  }
  nextTabLevel = Math.min(nextTabLevel, TAB_LEVEL.UNGROUPED);
  // Properly move tab
  await chrome.tabs.move(tab.id!, {index: activeTab.index + 1});
  // Properly group tab
  console.log("nextTabLevel", nextTabLevel);
  switch (nextTabLevel) {
    case TAB_LEVEL.UNGROUPED:
      break;
    case TAB_LEVEL.REGULAR:
      throw "This should not be possible";
    case TAB_LEVEL.NEW:
      await chrome.tabs.group({tabIds: tab.id, groupId: activeTab.groupId});
      break;
    case TAB_LEVEL.NEW_SOLO:
      const groupInfo = (await getGroupInfo(activeTab.groupId))!;
      const newGroup = await chrome.tabs.group({tabIds: tab.id});
      await chrome.tabGroups.update(newGroup, {title: groupInfo.emoji, color: groupInfo.color});
      // TODO: properly order. I fear `reorderTabs` will ruin order/potentially yield control in an invalid state
      break;
  }
  // Close tabs at higher levels
  await Promise.all(newTabs.map(newTab => newTab.index < tab.index ? chrome.tabs.remove(newTab.id!) : Promise.resolve()));
});

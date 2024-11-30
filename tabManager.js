import {TAB_LEVEL, NEWTAB_URL} from "./constants.js";
import {reorderTabs} from "./tabGroupManager.js";

/*
- Press control T once to create a new tab in the current task
- Press control T twice to create a new task in the current project
- Press control T thrice to make uncategorized tab
*/

async function getCurrentTab() {
    // using windowId as opposed to currentWindow or lastFocusedWindow b/c the latter 2 ignore new tabs
    let queryOptions = { active: true, windowId: chrome.windows.WINDOW_ID_CURRENT };
    // `tab` will either be a `tabs.Tab` instance or `undefined`.
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab;
}

async function tabState() {
    const tab = await getCurrentTab();
    let level;
    const isUngrouped = tab.groupId === -1;
    if (isUngrouped) {
        level = TAB_LEVEL.UNGROUPED;
    } else if ((tab.pendingUrl || tab.url) !== NEWTAB_URL) {
        level = TAB_LEVEL.REGULAR;
    } else {
        const siblingCount = (await chrome.tabs.query({ groupId: tab.groupId })).length;
        level = siblingCount > 1 ? TAB_LEVEL.NEW : TAB_LEVEL.NEW_SOLO;
    }
    return {
        tab,
        group: isUngrouped ? undefined : await chrome.tabGroups.get(tab.groupId),
        level,
    };
}

chrome.commands.onCommand.addListener(async (command) => {
    if (command !== "new-tab") return;
    
    const state = await tabState();
    if (state.level === TAB_LEVEL.UNGROUPED || state.level === TAB_LEVEL.REGULAR) {
        state.tab = await chrome.tabs.create({ url: NEWTAB_URL, index: state.tab.index + 1 });
    }
    switch (state.level) {
        case TAB_LEVEL.UNGROUPED: break;
        case TAB_LEVEL.REGULAR:
            await chrome.tabs.group({ tabIds: state.tab.id, groupId: state.group.id });
            break;
        case TAB_LEVEL.NEW:
            const newGroup = await chrome.tabs.group({ tabIds: state.tab.id });
            await chrome.tabGroups.update(newGroup, { title: state.group.title, color: state.group.color });
            break;
        case TAB_LEVEL.NEW_SOLO:
            await chrome.tabs.ungroup(state.tab.id);
            await reorderTabs(undefined, state.tab);
            break;
    }
});

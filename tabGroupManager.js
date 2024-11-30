import {COLORS} from "./constants.js";

export async function availableColors() {
    const groups = await chrome.tabGroups.query({});
    const usedColors = new Set(groups.map(group => group.color));
    const unusedColors = COLORS.filter(color => !usedColors.has(color));
    return unusedColors;
}

// Only one tab group can be open at a time
async function enforceSingleOpen(group) {
  if (group.collapsed === false) {
    try {
        const allGroups = await chrome.tabGroups.query({ windowId: group.windowId });

        await Promise.all(
          allGroups
            .filter(g => g.id !== group.id && !g.collapsed)
            .map(g => chrome.tabGroups.update(g.id, { collapsed: true }))
        );
    } catch(err) {
        console.log(err, "retrying...");
        setTimeout(enforceSingleOpen.bind(this, group), 100);
    }
  }
}

// Like-colored tab groups are adjacent
let isReorderingGroups = false;
async function reorderGroups(group) {
  const query = { windowId: group.windowId };
  // Must also query tabs b/c tabGroups is sorted by open time, not position
  const allTabs = await chrome.tabs.query(query);
  const allGroups = await chrome.tabGroups.query(query);
  const groupColors = new Map(allGroups.map(group => [group.id, group.color]));
  const colorOrder = {};
  const groupOrder = {};
  let tailIdx = 0;
  for (const tab of allTabs) {
      const color = groupColors.get(tab.groupId);
      if (!(color in colorOrder)) {
          colorOrder[color] = tailIdx++;
      }
      if (!(tab.groupId in groupOrder)) {
          groupOrder[tab.groupId] = tab.index;
      }
  }

  const sortedGroups = allGroups
    .toSorted((a, b) => a.color === b.color ? groupOrder[a.id] - groupOrder[b.id] : colorOrder[a.color] - colorOrder[b.color]);

  for (const group of sortedGroups) {
    await chrome.tabGroups.move(group.id, { index: -1 });
  }
  
  await reorderTabs(undefined, group);
}

// Ungrouped tabs are at the end
async function reorderTabs(_tabId, moveInfo) {
  const ungroupedTabs = await chrome.tabs.query({
      windowId: moveInfo.windowId,
      groupId: chrome.tabGroups.TAB_GROUP_ID_NONE,
      pinned: false
  });
  
  if (ungroupedTabs.length > 0) {
    await Promise.all(
      ungroupedTabs.map((tab, i) =>
        chrome.tabs.move(tab.id, { index: -1 })
      )
    );
  }
}

function resilientAsyncDebounceSkipper(callback, timeout = 100) {
    let timeoutRef = undefined;
    // Skip every other move event (1st user-triggered, 2nd programmatic fixing)
    // proper way would probably be to incr counter for expected ignorable move events, then decr on every event. Resume taking action once = 0
    let shouldSkip = false;
    function wrappedFn(...args) {
        if (timeoutRef) {
            clearTimeout(timeoutRef);
        }
        timeoutRef = setTimeout(() => {
            timeoutRef = undefined;
            shouldSkip = !shouldSkip;
            if (!shouldSkip) return;
            callback(...args).catch(err => {
                shouldSkip = false;
                console.log(err, "retrying...");
                wrappedFn(...args);
            });
        }, timeout);
    }
    
    return wrappedFn;
}

chrome.tabGroups.onMoved.addListener(resilientAsyncDebounceSkipper(reorderGroups));

chrome.tabs.onMoved.addListener(resilientAsyncDebounceSkipper(reorderTabs));

chrome.tabGroups.onUpdated.addListener(enforceSingleOpen);

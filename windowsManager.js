// Helper: Check if a window is within the bounds of a display
const isWindowWithinBounds = (window, bounds) => {
  const MAXIMIZED_OFFSET = 8;  // Silly quirk https://issues.chromium.org/issues/40210601
  return (
    window.left >= bounds.left - MAXIMIZED_OFFSET &&
    window.left <= bounds.left + bounds.width &&
    window.top >= bounds.top - MAXIMIZED_OFFSET &&
    window.top <= bounds.top + bounds.height
  );
};

// Helper: Get the primary display's Chrome window
const getPrimaryDisplayWindow = async () => {
  const displays = await chrome.system.display.getInfo();
  const primaryDisplay = displays.find((d) => d.isPrimary);
  if (!primaryDisplay) throw new Error("Primary display not found.");

  const windows = await chrome.windows.getAll({populate: true});

  return windows.find((win) => isWindowWithinBounds(win, primaryDisplay.bounds));
};

// Move all tabs and groups to the specified window
const moveToTargetWindow = async (sourceWindowId, targetWindowId) => {
  // Move tab groups
  const groups = await chrome.tabGroups.query({windowId: sourceWindowId});
  for (const group of groups) {
    await chrome.tabGroups.move(group.id, {windowId: targetWindowId});
  }

  // Move individual tabs
  const tabs = await chrome.tabs.query({windowId: sourceWindowId});
  for (const tab of tabs) {
    await chrome.tabs.move(tab.id, {windowId: targetWindowId, index: -1});
  }
};

// Helper: Get the display ID for a window based on its position
const getDisplayIdForWindow = async (window) => {
  const displays = await chrome.system.display.getInfo();
  const matchingDisplay = displays.find((display) =>
    isWindowWithinBounds(window, display.bounds)
  );
  return matchingDisplay ? matchingDisplay.id : null;
};

// Listener: Handle window movement and store window-to-display associations
const onWindowMoved = async (window) => {
  // Find the associated display
  const displayId = await getDisplayIdForWindow(window);
  if (displayId === null) {
    console.warn(`Window ${window.id} is not within any display.`);
    return;
  }

  // Store the window-to-display association
  const association = {[window.id]: displayId};
  await chrome.storage.session.set(association);
  console.log(`Stored association: Window ${window.id} -> Display ${displayId}`);
};

// Helper: Get active display IDs
const getActiveDisplayIds = async () => {
  const displays = await chrome.system.display.getInfo();
  return displays.map((display) => display.id);
};

// Handle onDisplayChanged events
const handleDisplayChange = async () => {
  const activeDisplayIds = await getActiveDisplayIds();
  const sessionData = await chrome.storage.session.get(null);

  // Find orphaned windows (those associated with non-existent displays)
  const orphanedWindows = Object.entries(sessionData).filter(
    ([windowId, displayId]) => !activeDisplayIds.includes(displayId)
  );

  if (orphanedWindows.length === 0) return;

  // Get a target window on an active display
  const targetWindow = await getPrimaryDisplayWindow();
  if (!targetWindow) throw new Error("No target window found on active displays.");

  // Move all tabs from orphaned windows to the target window
  for (const [windowId] of orphanedWindows) {
    const orphanWindowId = parseInt(windowId);
    await moveToTargetWindow(orphanWindowId, targetWindow.id);

    // Optionally, close the orphaned window after moving tabs
    // TODO: needed? await chrome.windows.remove(orphanWindowId);
  }

  console.log("Moved tabs from orphaned windows to the primary display window.");
};

// Monitor display changes
chrome.system.display.onDisplayChanged.addListener(handleDisplayChange);

// Monitor window movement and store associations
chrome.windows.onBoundsChanged.addListener(onWindowMoved);

// Clean windowId:displayId mapping
chrome.windows.onRemoved.addListener(windowId => chrome.storage.session.remove(String(windowId)));

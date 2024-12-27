import {availableColors} from "./tabGroupManager.js";

export async function bookmarkRoot() {
  const otherBookmarksId = (await chrome.bookmarks.getChildren('0'))[1].id;
  return findOrCreateBookmark(otherBookmarksId, "TabMan");
}

export async function allProjects() {
  return (await chrome.bookmarks.getChildren(await bookmarkRoot())).map(folder => folder.title);
}

export async function closeProject(color: ColorEnum, forever = false) {
  const folderId = await bookmarkRoot();
  // Fetch all tab groups
  const groups = await chrome.tabGroups.query({color});

  for (const group of groups) {
    // Get all tabs in the group
    const tabs = await chrome.tabs.query({groupId: group.id});

    if (!forever) {
      // Extract tab group name and split into first-level and second-level parts
      const [firstWord, ...restWords] = group.title!.split(' ');
      const firstLevelFolderName = firstWord || 'Default';
      const secondLevelFolderName = restWords.join(' ') || 'Untitled';

      // Find or create the first-level folder
      let firstLevelFolder = await findOrCreateBookmark(folderId, firstLevelFolderName);

      // Find or create the second-level folder
      let secondLevelFolder = await findOrCreateBookmark(firstLevelFolder, secondLevelFolderName);


      // Save each tab into the second-level folder. Wait after each instead of Promise.all to guarantee correct order.
      for (const tab of tabs) {
        await chrome.bookmarks.create({
          parentId: secondLevelFolder,
          title: tab.title,
          url: tab.url
        });
      }
    }

    await chrome.tabs.remove(tabs.map(tab => tab.id!));
  }
}

async function findChildNamed(parentId: string, title: string) {
  const children = await chrome.bookmarks.getChildren(parentId);
  return children.find((child) => child.title === title);
}

// Helper function to find or create a bookmark folder
async function findOrCreateBookmark(parentId: string, title: string) {
  const existingFolder = await findChildNamed(parentId, title);

  if (existingFolder) {
    return existingFolder.id;
  }
  return (await chrome.bookmarks.create({
    parentId,
    title
  })).id;
}

async function openInGroup(tabUrls: string[], groupOptions = {}) {
  // Open all URLs as new tabs
  const tabIds = await Promise.all(tabUrls.map(async url => (await chrome.tabs.create({url, active: false})).id!));

  // Group the opened tabs
  const groupId = await chrome.tabs.group({tabIds});

  // Apply group options (title, color)
  await chrome.tabGroups.update(groupId, groupOptions);
}


function notifyOpenFailure() {
  chrome.notifications.create("open-failure", {
    type: "basic",
    iconUrl: "icon.jpg",
    title: "TabMan",
    message: "Could not open or create project: limit for concurrent open projects met.",
  });
}


export async function reopenProject(title: string) {
  const color = (await availableColors())[0];
  if (color === undefined) {
    notifyOpenFailure();
    return false;
  }

  const existingFolder = (await findChildNamed(await bookmarkRoot(), title))!.id;  // Non-null, barring errors

  const subtree = await chrome.bookmarks.getSubTree(existingFolder);

  for (const task of subtree) {
    await openInGroup(task.children!.map(bookmark => bookmark.url!), {
      color,
      title: title + " " + task.title,
    });
  }

  await chrome.bookmarks.removeTree(existingFolder);
  return true;
}

import {getCurrentGroup} from "./tabGroupManager.js";
import {NEWTAB_URL} from "./constants.js";

const selectedTabIds = () =>
  chrome.tabs.query({highlighted: true, currentWindow: true}).then(tabs => tabs.map(tab => tab.id!));

async function selectedTabIdsOrNew() {
  const ids = await selectedTabIds();
  return ids.length ? ids : [(await chrome.tabs.create({url: NEWTAB_URL})).id!];
}

export async function newProject(name: string, emoji: string, color: ColorEnum) {
  const tabIds = await selectedTabIdsOrNew();
  const groupId = await chrome.tabs.group({tabIds});
  await chrome.tabGroups.update(groupId, {title: `${emoji} ${name}`, color});
}

export async function newTask(name: string) {
  const tabIds = await selectedTabIdsOrNew();
  const currentGroup = await getCurrentGroup();
  if (!currentGroup) return;
  const newGroupId = await chrome.tabs.group({tabIds});
  await chrome.tabGroups.update(newGroupId, {title: `${currentGroup.emoji} ${name}`, color: currentGroup.color});
}

async function changeAll(updateProperties: (group: TabGroup) => chrome.tabGroups.UpdateProperties) {
  const currentGroup = await getCurrentGroup();
  if (!currentGroup) return;
  for (const group of await chrome.tabGroups.query({color: currentGroup.color})) {
    await chrome.tabGroups.update(group.id, updateProperties(group));
  }
}

export const changeColor = (color: ColorEnum) =>
  changeAll(() => ({color}));

export const changeEmoji = (emoji: string) =>
  changeAll(group => ({title: `${emoji} ${group.title!.substring(group.title!.indexOf(" "))}`}));

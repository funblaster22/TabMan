import {COLORS} from "./constants.js";

export async function availableColors() {
    const groups = await chrome.tabGroups.query({});
    const usedColors = new Set(groups.map(group => group.color));
    const unusedColors = COLORS.filter(color => !usedColors.has(color));
    return unusedColors;
}
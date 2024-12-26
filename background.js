import "./omnibox.js";
import "./tabManager.js";
import "./tabGroupManager.js";
import "./windowsManager.js";

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Check if the tab's URL is starting to load, and if it matches google.com
  // if (changeInfo.url && changeInfo.url.includes("google.com")) {
  //  // Redirect to bing.com
  //  chrome.tabs.update(tabId, { url: "https://www.bing.com" });
  // }
});

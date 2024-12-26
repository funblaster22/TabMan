Design spec:

Using tab groups b/c multiple windows are clunky to switch between (+ no access to name to save) & slow to reload all tabs if closing all & opening new subject, & accidentally open tabs in the wrong subject (most often it's the window that's directly above icon)

Ctrl + T opens tab inside current group (if exists) by default
Clicking `+` button in tabbar or Ctrl + Shft + T opens new tab outside group
If outside group:
    If new tab: show centered group selection w/ search
    If existing tab: click extension icon to group. In this mode, you have the option to group current tab or all ungrouped tabs
    If select existing group, open the rest of the group.
    When creating new group, provide shortname (probably emojis, tab group name) and longname (shown in group browser)

If inside group & click ext icon, load group browser.
    
Ungrouped, unpinned tabs are closed after a timeout (a day?)
Only allow one group expanded at a time.
Opening a group collapses all others, moves it to the right (to visualize activity & allow "close to right"). Stretch: restore order after collapsing?
Groups are saved to bookmarks
To save chrome storage and my sanity, collapsed groups that have been unopened for longer than a week (Or configurable amount of time) will be closed
Also bind new shortcut to close tab with note (If maybe not important to keep but you learn something you want to remember from it) And it will accumulate document for that group.


NEW IDEA:
Since I know I often open up a bunch of reference tabs that I rarely look at again (But might be important enough that I don't wanna permanently delete it just in case), here's what changes:
- Default new tab behavior stays, with control shift T opening in the group.
- Ungrouped tabs aren't closed after inactivity. Instead, they're associated with the group. However, when the group closes, those loose tabs are all closed but stored to a file
- Reopening a group does not reopen loose tabs by default. Instead, they're accessible in a separate tab. These old loose tabs are stored indefinitely (grouped by session in chronological order) or there can be a limit.
- If no groups are open, you are in explore mode. Opening loose tabs is allowed. When you expand a new group, all loose tabs become untitled group. When you collapse that group again, it restores explore mode. The group corresponding to explore mode is not saved unless you title it.

Stays the same
- Opening a tab group closes all others and moves active one to the right 
- loose tabs must be on the right
- Pinned tabs are still allowed
- Checks for duplicates, both open and saved groups
    - If duplicte found, show notification w/ yes/no to open that group
        - If yes & tab in multiple groups, THEN prompt for group to open


NEW NEW IDEA:
I recently started using Arc and am overall generally a fan. However, there are still some stability and performance issues, plus the fact that I can't script spaces with extensions. I then looked at what Microsoft Edge was doing and saw that they added their own version of workspaces. However, these open in their own window, also can't be scripted, and I'm not a fan of all the AI bloatware Microsoft is putting in.

Switching workspaces would involve closing all tabs (have already been bookmarked). Pinned tabs will travel between all workspaces. On one hand, replacing all tabs and switching workspaces decreases clutter, but it could also add significant loading time.

I do like that each workspace gets its own set of bookmarks in Edge. This would emulate Arc's pinned section. It might even be better because often times I want to jump to the same starting point but then navigate away. Combined with the automatic garbage collection, I can open as many tabs as needed without having to worry about keeping them organized or spending time to see if it's already open. Bookmark bar can remain closed most of the time.

The bookmarks will also provide useful context to the workspace. If I replace the new tab with an omnibox experience, I can recommend results that are bookmarked in that session. For example, in the `CS` workspace, typing `brightspace` with open the CS brightspace page, saving on clicks or having to navigate my mouse to the bookmarks bar.

I considered using tab groups to represent these workspace-contextual sites but decided against it because some of theme are rarely used (just for reference) and distract/take up space.

Although I worry organizing tab groups would distract from browser tasks, they might be useful for designating some tabs that should have a longer lifetime or multiple short-term projects w/i a certain topic (eg: reading & essay for SCLA). Ex: Wiki page for an ongoing show, github code you are currently analyzing and want to be able to resume after taking a weeklong break. Going and making bookmarks for these sites would be problematic because it would be both tedious and eventually clutter your bookmarks bar because you only need it for a fixed amount of time. These groups will be closed on a all-or-nothing basis: if at least one tab within is viewed, it resets the timer for the entire group.

The new omnibox will decrease cognitive load so that I will hardly ever have to search through my tab list. When ordering results, here are the priorities:
1. currently opened tabs
2. workspace bookmarks
3. common websites (debated not including to make a workspace "pure", but figured would slow me down if I needed to switch workspace just to open. Also garbage collection makes it less of an issue if a tab is opened in the wrong workspace)
4. Open tabs in other workspaces (accepting suggestion will switch workspace)
One significant drawback is that I lose search prediction, or have to implement it myself. (actually, I think google has an API for this?)

To switch workspaces, you click the extension (or use a keyboard shortcut) and are presented with your most recent (or custom order), which you can navigate with more keyboard shortcuts. Workspace switching would also be accessible from the omnibox through `w:`, `goto` or some other prefix.

Auto-archived tabs are saved to a file specific to that workspace for peace-of-mind. Contained within the rightmost tab group with workspace name. Will also have other workspace metadata

With this train of thought I considered taking it to the extreme and only showing one tab at a time and hiding the rest in a group, but I realize there are several useful cases where I need to tap to the left and right.

Arc windowing is pretty terrible, so I'll be sticking to window tiling, which is already good and intuitive. If it's possible, I want to enforce that there can only be 1 window/window group (if tiled) per monitor. This prevents duplicating tabs you can't see. For example, disconnecting a monitor will consolidate all its tabs onto another window.

Need a shortcut and context action to move a tab from one workspace to another (reset its time to live)

Here's what the bookmark structure will look like:
```
Other bookmarks
    SessionSaver\
        english (workspace)
            essay 1 (tab group)
                google docs (tab)
            reading (tab group)
```
shared/common bookmarks were scrapped because they defeat the "sanitation" of the workspace

Like Arc, there should be a "replace this bookmark w/ current page" shortcut or context action. Ex: It's the new year & you want to replace the CS 251 brightspace link with the one for 252. It will look at the first entry in that tab's history's URL, find the corresponding bookmark, and update it.


BRAND NEW IDEA!
What if instead of automatically closing tabs after a fixed time, it's more intelligent? The extension can watch and observe how long on average a tab stays open before it is closed and replicate that.

I also find that when I'm coding or researching, I have a burst of tabs for one idea or issue, but once I resolve that (or forget about/abandon) I may not go back to the group. What if now, all tabs MUST be grouped into a "thought". This is similar to branching tabs, except that it's flat.

When you have a new thought, pressing control + t adds it to that group. Control shift t creates a new group. The groups can either be named manually on 1st tab creation or automatically with a llm.

Actually, all new tabs should not be required to be in a group b/c sometimes I want to look up one-off, throwaway ideas (eg: yt music). I have two proposals:
1. ctrl + alt + t to open new tab omnibox. Search for "<delimiter?><tab group name?><delimiter?><query>", where if tab group name and delimiter are omitted, it stays single.
2. pressing control + t on ungrouped tab automatically groups both tabs and asks for name. ctrl + alt + t always opens an ungrouped tab.
3. both?
4. control + t opens tab to right (ungrouped). Based on the query, domain, and title, it'll use a classification network to predict if it is related to its referrer (where it was opened from, either individual or group). Control Alt N instead only as opens a group  
5. Forget control T , use arrow keys. Control plus an arrow key will create a new tab to the left or right (stays in tab group if already). holding alt will always escape the tab grou
Ungrouped tabs would have a lifespan of 12 hours.

As before, these groups are closed on a all-or-nothing basis after maybe a 2 weeks.

This came to me after a frustrating experience in Arc where I tried to return to figuring out how to avoid the need for a webrtc TURN server by adjusting my NAT settings. The archive was of no help (b/c Arc also mixes this across workspaces).

Problem: I feel like I more often open one-off tabs. Plus, saving stack overflow bookmarks for perpetuity after I fix a bug seems a little excessive.

Solution: TODO

===

Some problems I've had using arc are that
- I create a bunch of music tabs and they get separated across different work spaces even though they're not associated with one workspace
- It's sluggish
- I can't see the workspaces on the bottom without hovering, which wastes time
- omnibox is kinda dumb
- I will open unrelated tabs from random ideas I have in a workspace
- sometimes closes tabs that I actually need or wanted to remember and it's hard to find and get them back (make a read later queue?)
- tabs for solved problems stay open, slowing down time searching for tab I want
- lack of custom search engines (tab to search yt music)



I'm again leaning back towards having all the workspace tabs open in collapsed groups. Since I found that the majority of tabs open can be safely discarded after a short time, that should be the default.

Since I think browsing should come first and organizing second, ~~I propose a new keyboard shortcut to mark the current topic complete~~

It seems The only truly automatic way to sort tabs is with the use of an AI classifier, but I am skeptical of its reliability.

~~instead of workspaces, there should be a context mode.~~ Still has issue of many various tasks for different projects mixed together, causing confusion. Maybe seperation is a good thing for focus too? Will likely cause more issues than meant to solve, which is opening tabs in wrong workspace. Utilize AI?

AI classifier needs to decide:
- Is tab consistent with previous tabs opened in this workspace?
- Predict how long tab will stay open, then autoclose after

===

I've been struggling to bring all my ideas together for awhile, so what I think I'm gonna finally try implementing is a machine learning classifier. As you open tabs in groups, it learns what they belong to and how long each domain/topic stays open until closed. This will inform the autoclose policy. Autoclose acts on both tabs and task groups. If you open a tab it thinks doesn't belong, it will automaticaly get recategorized, with the ability to type ctrl+z to undo.
- Press control T once to create a new tab in the current task
- Press control T twice to create a new task in the current project
- Press control T thrice to make uncategorized tab
(make this a global shortcut, then focus chrome)

Organization:
- Each project gets its own color and Emoji. Subtasks within that project have the emoji prepended along with a short description.
- task tab groups will be kept nearby others in project
- Only one tab group is allowed to be open at a time

omnibox shortcuts
Map <dst>: automatically redirect this tab when visited in this project, to <dst>. Will create a bookmark folder with title <src> linking to <dst>
Open <project>: opens an archived project
Close <"forever"?>: close this project and bookmarks all the tabs & tasks in nested folders. If "forever" included, will not make bookmarks
color <color>: change the color of this project
emoji <emoji>: change the emoji of this project
new <name> <emoji> <color?>: create a new project
recov: (mapped to searching too) Opens the page with tabs and groups that have been auto-closed from the current project

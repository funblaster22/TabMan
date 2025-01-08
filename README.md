# TabMan

Web extension to enforce tab organization rules.

## Terminology
### Project
A collection of tab groups for a specific project (eg. Math class). All tasks within a project start with the same emoji/word and share a group color. Can only make as many projects as there are colors available (9)

### Task
An idea or subtask within a project (eg: homework 12, ). All projects within a task are enforced to be adjacent. Only one task group can be expanded at a time

### Uncategorized tab
Tab that belongs to neither a project nor task. Are enforced to be to the right of all projects/tasks (unless pinned)

## Features
### Creating a new tab
- Are added to the immediate right of current tab (unmodified behavior places at far right)
- Press control T once to create a new tab in the current task
- Press control T twice to create a new task in the current project
- Press control T thrice to make uncategorized tab

### Managing projects & tasks
- press `control + L` or click the omnibox
- type `l` then press tab to activate the TabMan command palette
- press space to show suggestions

<details>
<summary>Text list of commands</summary>

- **Map <dst>:** automatically redirect this tab when visited in this project, to <dst>. Will create a bookmark folder with title <src> linking to <dst>
- **Open <project>:** opens an archived project
- **Close <"forever"?>:** close this project and bookmarks all the tabs & tasks in nested folders. If "forever" included, will not make bookmarks
- **color <color>:** change the color of this project
- **emoji <emoji>:** change the emoji of this project
- **new <name> <emoji> <color?>:** create a new project
- **recov:** (mapped to searching too) Opens the page with tabs and groups that have been auto-closed from the current project
- **task <name>:** create a new task in the current project from selected tabs

</details>


## Developing
1. Install dependencies with `pnpm i`
2. Start typescript compilation with `pnpm dev` (watch mode) or `pnpm build` (once)
3. load unpacked extension from `dist` directory

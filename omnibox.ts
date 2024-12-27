import {COLORS} from "./constants.js";
import {allProjects, closeProject, reopenProject} from "./bookmarkManager.js";
import {availableColors} from "./tabGroupManager.js";

/*
omnibox shortcuts
Map <dst>: automatically redirect this tab when visited in this project, to <dst>. Will create a bookmark folder with title <src> linking to <dst>
Open <project>: opens an archived project
Close <"forever"?>: close this project and bookmarks all the tabs & tasks in nested folders. If "forever" included, will not make bookmarks
color <color>: change the color of this project
emoji <emoji>: change the emoji of this project
new <name> <emoji> <color?>: create a new project
recov: (mapped to searching too) Opens the page with tabs and groups that have been auto-closed from the current project

TODO:
task <name>: create a new task in the current project from selected tabs
close <"right">: close all tabs to the right of the current tab w/i current project
*/

const projects: string[] = [];
const unusedColors: ColorEnum[] = [];

const enum CMD_TYP {
  CMD = "cmd",
  STR = "str",
  LITERAL = "literal",
  OPTION = "option",
}

interface LiteralArg {
  type: CMD_TYP.LITERAL | CMD_TYP.CMD,
  value: string,
}

interface OptionArg {
  type: CMD_TYP.OPTION,
  value: readonly string[],
}

interface StringArg {
  type: CMD_TYP.STR,
  name: string,
  value?: never,
}

type CommandArg = (LiteralArg | OptionArg | StringArg) & {
  name?: string,
  optional?: boolean,
  help?: string,
  callback?: (args: string[]) => void,
};

type Command = CommandArg[];

type ParsedCommand = ReturnType<typeof validateCommand>;

const commands: CommandArg[][] = [
  [
    {
      type: CMD_TYP.CMD,
      value: "map",
      help: "automatically redirect this tab when visited in this project",
    },
    {
      type: CMD_TYP.STR,
      name: "dst",
    },
  ],
  [
    {
      type: CMD_TYP.CMD,
      value: "open",
      help: "opens an archived project",
      callback: args => reopenProject(args[0]),
    },
    {
      type: CMD_TYP.OPTION,
      value: projects,
      name: "projects",
    },
    {
      type: CMD_TYP.OPTION,
      value: unusedColors,
      name: "color",
      optional: true,
    },
  ],
  [
    {
      type: CMD_TYP.CMD,
      value: "close",
      help: 'close this project',
      callback: args => closeProject("blue", args[0] === "forever"),
    },
    {
      type: CMD_TYP.LITERAL,
      value: "forever",
      optional: true,
      help: "do not save this project for later"
    },
  ],
  [
    {
      type: CMD_TYP.CMD,
      value: "color",
      help: "change the color of this project",
    },
    {
      type: CMD_TYP.OPTION,
      value: COLORS,
      name: "color",
    },
  ],
  [
    {
      type: CMD_TYP.CMD,
      value: "emoji",
      help: "change the emoji of this project",
    },
    {
      type: CMD_TYP.STR,
      name: "emoji",
    },
  ],
  [
    {
      type: CMD_TYP.CMD,
      value: "new",
      help: "create a new project",
    },
    {
      type: CMD_TYP.STR,
      name: "name",
    },
    {
      type: CMD_TYP.STR,
      name: "emoji",
    },
    {
      type: CMD_TYP.OPTION,
      value: unusedColors,
      name: "color",
      optional: true,
    },
  ],
  [
    {
      type: CMD_TYP.CMD,
      value: "recov",
      help: "show tabs &amp; groups that have been closed in this project",
    },
  ],
];

/**
 * TODO docs
 * @param command
 * @param text
 * @param checkCompleteness if enabled, only mark as "valid" if all parameters filled
 * @return TODO fgh
 */
function validateCommand(command: Command, text: string, checkCompleteness = false) {
  const result = {
    command,
    help: command[0].help,
    lastCorrectIdx: -1,
    suggestions: [] as string[],
    valid: false,
  };
  const tokenizedText = text.trim().replaceAll(/ +/g, " ").split(" ");
  for (let idx = 0; idx < tokenizedText.length; idx++) {
    const userToken = tokenizedText[idx];
    const cmdArg = command[idx];
    if (cmdArg === undefined) {
      result.help = "Too many arguments";
      result.valid = false;
      break;
    }
    const isLast = idx === tokenizedText.length - 1 && !checkCompleteness;
    switch (cmdArg.type) {
      case CMD_TYP.STR:
        result.valid = true;
        break;
      case CMD_TYP.LITERAL:
        if (cmdArg.optional) {
          result.suggestions = [cmdArg.value];
        }
      // don't break
      case CMD_TYP.CMD:
        result.valid = isLast ? cmdArg.value.startsWith(userToken) : cmdArg.value === userToken;
        break;
      case CMD_TYP.OPTION:
        if (isLast) {
          result.suggestions = cmdArg.value.filter(option => option.startsWith(userToken));
          result.valid = result.suggestions.length > 0;
        } else {
          result.valid = cmdArg.value.includes(userToken);
        }
        if (!result.valid) result.help = "ERROR: unknown " + cmdArg.name;
        break;
    }

    if (result.valid) {
      if (cmdArg.help) result.help = cmdArg.help;
      result.lastCorrectIdx++;
    } else {
      break;
    }
  }
  return result;
}

/**
 * TODO docs
 * @param text
 * @param checkCompleteness
 * @return
 */
function findBestCommands(text: string, checkCompleteness = false) {
  let longestLength = -1;
  let matches = [];
  for (const cmd of commands) {
    const results = validateCommand(cmd, text, checkCompleteness);
    if (results.lastCorrectIdx > longestLength) {
      matches = [];
      longestLength = results.lastCorrectIdx;
    }
    if (results.lastCorrectIdx === longestLength) {
      matches.push(results);
    }
  }
  return matches;
}

function constructSuggestion(text: string, parsedCommand: ParsedCommand) {
  const prettySignature = parsedCommand.command.map((arg, idx) => {
    let prefix = "";
    let suffix = "";
    if (arg.type !== CMD_TYP.CMD) {
      prefix = "&lt;"
      suffix = "&gt;";
    }
    if (arg.optional) {
      suffix = "?" + suffix;
    }
    if (arg.type === CMD_TYP.LITERAL) {
      prefix += '"';
      suffix = '"' + suffix;
    }
    if (parsedCommand.lastCorrectIdx === idx) {
      prefix = "<match>" + prefix;
      suffix += "</match>";
    }
    const name = arg.name || arg.value || arg.type;
    return prefix + name + suffix;
  });
  return {
    content: parsedCommand.command[0].value + " " + text.split(" ").slice(1, parsedCommand.lastCorrectIdx).join(" "),
    description: prettySignature.join(" ") + ` <dim>${parsedCommand.help}</dim>`,
  };
}

chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  const bestCommands = findBestCommands(text);
  const suggestions = bestCommands.map(cmd => constructSuggestion(text, cmd));
  if (bestCommands[0].lastCorrectIdx === -1) {
    suggestions.unshift({content: " ", description: "<dim>ERROR: unknown command</dim>"});
  }
  if (bestCommands.length === 1) {
    suggestions.push(...bestCommands[0].suggestions.map(suggestion => ({
      content: suggestions[0].content + suggestion,
      description: suggestion
    })));
  }
  suggest(suggestions);
  console.log(text, bestCommands, suggestions);
});

chrome.omnibox.onInputStarted.addListener(() => {
  allProjects().then(res => projects.push(...res));
  availableColors().then(res => unusedColors.push(...res));
})

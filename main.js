/*!
 * Brackets Git Extension
 *
 * @author Martin Zagora
 * @license http://opensource.org/licenses/MIT
 */

define(function (require, exports, module) {

    // Brackets modules
    var _               = brackets.getModule("thirdparty/lodash"),
        AppInit         = brackets.getModule("utils/AppInit"),
        CommandManager  = brackets.getModule("command/CommandManager"),
        Commands        = brackets.getModule("command/Commands"),
        ExtensionUtils  = brackets.getModule("utils/ExtensionUtils"),
        Menus           = brackets.getModule("command/Menus");

    // Local modules
    var SettingsDialog  = require("src/SettingsDialog"),
        EventEmitter    = require("src/EventEmitter"),
        Events          = require("src/Events"),
        Main            = require("src/Main"),
        Preferences     = require("src/Preferences"),
        Strings         = require("strings");

    // Load extension modules that are not included by core
    var modules = [
        "src/BracketsEvents",
        "src/GutterManager",
        "src/History",
        "src/NoRepo",
        "src/ProjectTreeMarks",
        "src/Remotes",
        "src/utils/Terminal"
    ];
    if (Preferences.get("useGitFtp")) { modules.push("src/ftp/Ftp"); }
    if (Preferences.get("showTerminalIcon")) { modules.push("src/TerminalIcon"); }
    require(modules);

    // Load CSS
    ExtensionUtils.loadStyleSheet(module, "styles/brackets-git.less");
    ExtensionUtils.loadStyleSheet(module, "styles/fonts/octicon.less");
    if (Preferences.get("useGitFtp")) { ExtensionUtils.loadStyleSheet(module, "src/ftp/styles/ftp.less"); }

    // Register command and add it to the menu.
    var SETTINGS_COMMAND_ID = "brackets-git.settings";
    CommandManager.register(Strings.GIT_SETTINGS, SETTINGS_COMMAND_ID, SettingsDialog.show);
    Menus.getMenu(Menus.AppMenuBar.FILE_MENU).addMenuItem(SETTINGS_COMMAND_ID, "", Menus.AFTER, Commands.FILE_EXTENSION_MANAGER);

    AppInit.appReady(function () {
        Main.init();
    });

    // export API's for other extensions
    if (typeof window === "object") {
        window.bracketsGit = {
            EventEmitter: EventEmitter,
            Events: Events
        };
    }
});

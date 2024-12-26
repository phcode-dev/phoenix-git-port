/*!
 * Brackets Git Extension
 *
 * @author Martin Zagora
 * @license http://opensource.org/licenses/MIT
 */

define(function (require, exports, module) {

    // Brackets modules
    const _               = brackets.getModule("thirdparty/lodash"),
        AppInit         = brackets.getModule("utils/AppInit"),
        ExtensionUtils  = brackets.getModule("utils/ExtensionUtils");

    // Local modules
    require("src/SettingsDialog");
    const EventEmitter    = require("src/EventEmitter"),
        Events          = require("src/Events"),
        Main            = require("src/Main"),
        Preferences     = require("src/Preferences");

    // Load extension modules that are not included by core
    var modules = [
        "src/BracketsEvents",
        "src/GutterManager",
        "src/History",
        "src/NoRepo",
        "src/ProjectTreeMarks",
        "src/Remotes"
    ];
    if (Preferences.get("useGitFtp")) { modules.push("src/ftp/Ftp"); }
    require(modules);

    // Load CSS
    ExtensionUtils.loadStyleSheet(module, "styles/brackets-git.less");
    ExtensionUtils.loadStyleSheet(module, "styles/fonts/octicon.less");
    if (Preferences.get("useGitFtp")) { ExtensionUtils.loadStyleSheet(module, "src/ftp/styles/ftp.less"); }

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

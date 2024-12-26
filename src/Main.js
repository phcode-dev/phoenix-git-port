define(function (require, exports) {
    "use strict";

    const _                 = brackets.getModule("thirdparty/lodash"),
        CommandManager    = brackets.getModule("command/CommandManager"),
        Commands          = brackets.getModule("command/Commands"),
        Menus             = brackets.getModule("command/Menus"),
        FileSystem        = brackets.getModule("filesystem/FileSystem"),
        ProjectManager    = brackets.getModule("project/ProjectManager");

    const Constants       = require("src/Constants"),
        ExpectedError     = require("src/ExpectedError"),
        Events            = require("src/Events"),
        EventEmitter      = require("src/EventEmitter"),
        Strings           = require("strings"),
        ErrorHandler      = require("src/ErrorHandler"),
        Panel             = require("src/Panel"),
        Branch            = require("src/Branch"),
        SettingsDialog    = require("src/SettingsDialog"),
        CloseNotModified  = require("src/CloseNotModified"),
        Setup             = require("src/utils/Setup"),
        Preferences       = require("src/Preferences"),
        Utils             = require("src/Utils");

    var CMD_ADD_TO_IGNORE      = "git.addToIgnore",
        CMD_REMOVE_FROM_IGNORE = "git.removeFromIgnore",
        $icon                  = $("<a id='git-toolbar-icon' href='#'></a>")
                                    .attr("title", Strings.LOADING)
                                    .addClass("loading")
                                    .appendTo($("#main-toolbar .buttons"));

    EventEmitter.on(Events.GIT_DISABLED, function () {
        $icon.removeClass("dirty");
    });

    EventEmitter.on(Events.GIT_STATUS_RESULTS, function (results) {
        $icon.toggleClass("dirty", results.length !== 0);
    });

    // This only launches when Git is available
    function initUi() {
        // FUTURE: do we really need to launch init from here?
        Panel.init();
        Branch.init();
        CloseNotModified.init();
        // Attach events
        $icon.on("click", Panel.toggle);
    }

    function _addRemoveItemInGitignore(selectedEntry, method) {
        var gitRoot = Preferences.get("currentGitRoot"),
            entryPath = "/" + selectedEntry.fullPath.substring(gitRoot.length),
            gitignoreEntry = FileSystem.getFileForPath(gitRoot + ".gitignore");

        gitignoreEntry.read(function (err, content) {
            if (err) {
                Utils.consoleLog(err, "warn");
                content = "";
            }

            // use trimmed lines only
            var lines = content.split("\n").map(function (l) { return l.trim(); });
            // clean start and end empty lines
            while (lines.length > 0 && !lines[0]) { lines.shift(); }
            while (lines.length > 0 && !lines[lines.length - 1]) { lines.pop(); }

            if (method === "add") {
                // add only when not already present
                if (lines.indexOf(entryPath) === -1) { lines.push(entryPath); }
            } else if (method === "remove") {
                lines = _.without(lines, entryPath);
            }

            // always have an empty line at the end of the file
            if (lines[lines.length - 1]) { lines.push(""); }

            gitignoreEntry.write(lines.join("\n"), function (err) {
                if (err) {
                    return ErrorHandler.showError(err, "Failed modifying .gitignore");
                }
                Panel.refresh();
            });
        });
    }

    function addItemToGitingore() {
        return _addRemoveItemInGitignore(ProjectManager.getSelectedItem(), "add");
    }

    function removeItemFromGitingore() {
        return _addRemoveItemInGitignore(ProjectManager.getSelectedItem(), "remove");
    }

    function addItemToGitingoreFromPanel() {
        var filePath = Panel.getPanel().find("tr.selected").attr("x-file"),
            fileEntry = FileSystem.getFileForPath(Preferences.get("currentGitRoot") + filePath);
        return _addRemoveItemInGitignore(fileEntry, "add");
    }

    function removeItemFromGitingoreFromPanel() {
        var filePath = Panel.getPanel().find("tr.selected").attr("x-file"),
            fileEntry = FileSystem.getFileForPath(Preferences.get("currentGitRoot") + filePath);
        return _addRemoveItemInGitignore(fileEntry, "remove");
    }

    function initGitMenu() {
        // Register command and add it to the menu.
        const fileMenu = Menus.getMenu(Menus.AppMenuBar.FILE_MENU);
        let gitSubMenu = fileMenu.addSubMenu(Constants.GIT_STRING_UNIVERSAL,
            Constants.GIT_SUB_MENU, Menus.AFTER, Commands.FILE_EXTENSION_MANAGER);
        fileMenu.addMenuDivider(Menus.AFTER, Commands.FILE_EXTENSION_MANAGER);
        gitSubMenu.addMenuItem(Constants.CLOSE_UNMODIFIED);
        gitSubMenu.addMenuDivider();
        gitSubMenu.addMenuItem(Constants.SETTINGS_COMMAND_ID);
    }

    function init() {
        $icon.removeClass("loading").removeAttr("title");
        CommandManager.register(Strings.GIT_SETTINGS, Constants.SETTINGS_COMMAND_ID, SettingsDialog.show);
        // Try to get Git version, if succeeds then Git works
        Setup.findGit().then(function (_version) {

            initUi();
            initGitMenu();

        }).catch(function (err) {
            $icon.addClass("error").attr("title", Strings.CHECK_GIT_SETTINGS + " - " + err.toString());

            var expected = new ExpectedError(err);
            // todo git: docs url update here
            expected.detailsUrl = "https://docs.phcode.dev/docs/";
            ErrorHandler.showError(expected, Strings.CHECK_GIT_SETTINGS);

        });

        // register commands for project tree / working files
        CommandManager.register(Strings.ADD_TO_GITIGNORE, CMD_ADD_TO_IGNORE, addItemToGitingore);
        CommandManager.register(Strings.REMOVE_FROM_GITIGNORE, CMD_REMOVE_FROM_IGNORE, removeItemFromGitingore);

        // create context menu for git panel
        const panelCmenu = Menus.registerContextMenu("git-panel-context-menu");
        CommandManager.register(Strings.ADD_TO_GITIGNORE, CMD_ADD_TO_IGNORE + "2", addItemToGitingoreFromPanel);
        CommandManager.register(Strings.REMOVE_FROM_GITIGNORE, CMD_REMOVE_FROM_IGNORE + "2", removeItemFromGitingoreFromPanel);
        panelCmenu.addMenuItem(CMD_ADD_TO_IGNORE + "2");
        panelCmenu.addMenuItem(CMD_REMOVE_FROM_IGNORE + "2");
    }

    var _toggleMenuEntriesState = false,
        _divider1 = null,
        _divider2 = null;
    function toggleMenuEntries(bool) {
        if (bool === _toggleMenuEntriesState) {
            return;
        }
        var projectCmenu = Menus.getContextMenu(Menus.ContextMenuIds.PROJECT_MENU);
        var workingCmenu = Menus.getContextMenu(Menus.ContextMenuIds.WORKING_SET_CONTEXT_MENU);
        if (bool) {
            _divider1 = projectCmenu.addMenuDivider();
            _divider2 = workingCmenu.addMenuDivider();
            projectCmenu.addMenuItem(CMD_ADD_TO_IGNORE);
            workingCmenu.addMenuItem(CMD_ADD_TO_IGNORE);
            projectCmenu.addMenuItem(CMD_REMOVE_FROM_IGNORE);
            workingCmenu.addMenuItem(CMD_REMOVE_FROM_IGNORE);
        } else {
            projectCmenu.removeMenuDivider(_divider1.id);
            workingCmenu.removeMenuDivider(_divider2.id);
            projectCmenu.removeMenuItem(CMD_ADD_TO_IGNORE);
            workingCmenu.removeMenuItem(CMD_ADD_TO_IGNORE);
            projectCmenu.removeMenuItem(CMD_REMOVE_FROM_IGNORE);
            workingCmenu.removeMenuItem(CMD_REMOVE_FROM_IGNORE);
        }
        _toggleMenuEntriesState = bool;
    }

    // Event handlers
    EventEmitter.on(Events.GIT_ENABLED, function () {
        toggleMenuEntries(true);
    });
    EventEmitter.on(Events.GIT_DISABLED, function () {
        toggleMenuEntries(false);
    });

    // API
    exports.$icon = $icon;
    exports.init = init;

});

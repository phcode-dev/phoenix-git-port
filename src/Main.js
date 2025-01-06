define(function (require, exports) {
    "use strict";

    const _               = brackets.getModule("thirdparty/lodash"),
        CommandManager    = brackets.getModule("command/CommandManager"),
        Commands          = brackets.getModule("command/Commands"),
        Menus             = brackets.getModule("command/Menus"),
        FileSystem        = brackets.getModule("filesystem/FileSystem"),
        Mustache          = brackets.getModule("thirdparty/mustache/mustache"),
        ProjectManager    = brackets.getModule("project/ProjectManager");

    const Constants       = require("src/Constants"),
        ExpectedError     = require("src/ExpectedError"),
        Events            = require("src/Events"),
        EventEmitter      = require("src/EventEmitter"),
        Strings           = require("strings"),
        StringUtils             = brackets.getModule("utils/StringUtils"),
        ErrorHandler      = require("src/ErrorHandler"),
        Panel             = require("src/Panel"),
        Branch            = require("src/Branch"),
        SettingsDialog    = require("src/SettingsDialog"),
        Dialogs                 = brackets.getModule("widgets/Dialogs"),
        CloseNotModified  = require("src/CloseNotModified"),
        Setup             = require("src/utils/Setup"),
        Preferences       = require("src/Preferences"),
        Utils             = require("src/Utils"),
        Git               = require("src/git/Git"),
        gitTagDialogTemplate    = require("text!templates/git-tag-dialog.html");

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
                Utils.consoleWarn(err);
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

    function _refreshCallback() {
        EventEmitter.emit(Events.REFRESH_ALL);
    }

    function checkoutCommit(commitHash) {
        const commitDetail = Panel.getSelectedHistoryCommit() || {};
        commitHash = commitHash || commitDetail.hash;
        const commitDetailStr = commitDetail.subject || "";
        if(!commitHash){
            console.error(`Cannot do Git checkout as commit hash is ${commitHash}`);
            return;
        }
        const displayStr = StringUtils.format(Strings.CHECKOUT_COMMIT_DETAIL, commitDetailStr, commitHash);
        Utils.askQuestion(Strings.TITLE_CHECKOUT,
            displayStr + "<br><br>" + Strings.DIALOG_CHECKOUT,
            { booleanResponse: true, noescape: true, customOkBtn: Strings.CHECKOUT_COMMIT })
            .then(function (response) {
                if (response === true) {
                    return Git.checkout(commitHash).then(_refreshCallback);
                }
            });
    }

    function tagCommit(commitHash) {
        const commitDetail = Panel.getSelectedHistoryCommit() || {};
        commitHash = commitHash || commitDetail.hash || "";
        const compiledTemplate = Mustache.render(gitTagDialogTemplate, { Strings }),
            dialog           = Dialogs.showModalDialogUsingTemplate(compiledTemplate),
            $dialog          = dialog.getElement();
        $dialog.find("input").focus();
        $dialog.find("button.primary").on("click", function () {
            const tagname = $dialog.find("input.commit-message").val();
            Git.setTagName(tagname, commitHash).then(function () {
                EventEmitter.emit(Events.REFRESH_HISTORY);
            }).catch(function (err) {
                ErrorHandler.showError(err, "Create tag failed");
            });
        });
    }

    function _resetOperation(operation, commitHash, title, message) {
        const commitDetail = Panel.getSelectedHistoryCommit() || {};
        commitHash = commitHash || commitDetail.hash;
        const commitDetailStr = commitDetail.subject || "";
        if(!commitHash){
            console.error(`Cannot do Git Reset ${operation} as commit hash is ${commitHash}`);
            return;
        }
        const gitCmdUsed = `git reset ${operation} ${commitHash}`;
        const displayStr = StringUtils.format(Strings.RESET_DETAIL, commitDetailStr, gitCmdUsed);
        Utils.askQuestion(title,
            message + "<br><br>" + displayStr,
            { booleanResponse: true, noescape: true ,
                customOkBtn: Strings.RESET, customOkBtnClass: "danger"})
            .then(function (response) {
                if (response === true) {
                    return Git.reset(operation, commitHash).then(_refreshCallback);
                }
            });
    }

    function resetHard(commitHash) {
        return _resetOperation("--hard", commitHash,
            Strings.RESET_HARD_TITLE, Strings.RESET_HARD_MESSAGE);
    }

    function resetMixed(commitHash) {
        return _resetOperation("--mixed", commitHash,
            Strings.RESET_MIXED_TITLE, Strings.RESET_MIXED_MESSAGE);
    }

    function resetSoft(commitHash) {
        return _resetOperation("--soft", commitHash,
            Strings.RESET_SOFT_TITLE, Strings.RESET_SOFT_MESSAGE);
    }

    function initGitMenu() {
        // Register command and add it to the menu.
        const fileMenu = Menus.getMenu(Menus.AppMenuBar.FILE_MENU);
        let gitSubMenu = fileMenu.addSubMenu(Constants.GIT_STRING_UNIVERSAL,
            Constants.GIT_SUB_MENU, Menus.AFTER, Commands.FILE_EXTENSION_MANAGER);
        fileMenu.addMenuDivider(Menus.AFTER, Commands.FILE_EXTENSION_MANAGER);
        gitSubMenu.addMenuItem(Constants.CMD_GIT_TOGGLE_PANEL);
        gitSubMenu.addMenuItem(Constants.CMD_GIT_REFRESH);
        gitSubMenu.addMenuDivider();
        gitSubMenu.addMenuItem(Constants.CMD_GIT_GOTO_NEXT_CHANGE);
        gitSubMenu.addMenuItem(Constants.CMD_GIT_GOTO_PREVIOUS_CHANGE);
        gitSubMenu.addMenuItem(Constants.CMD_GIT_CLOSE_UNMODIFIED);
        gitSubMenu.addMenuDivider();
        gitSubMenu.addMenuItem(Constants.CMD_GIT_COMMIT_CURRENT);
        gitSubMenu.addMenuItem(Constants.CMD_GIT_COMMIT_ALL);
        gitSubMenu.addMenuDivider();
        gitSubMenu.addMenuItem(Constants.CMD_GIT_PULL);
        gitSubMenu.addMenuItem(Constants.CMD_GIT_PUSH);
        gitSubMenu.addMenuDivider();
        gitSubMenu.addMenuItem(Constants.CMD_GIT_SETTINGS_COMMAND_ID);

        // register commands for project tree / working files
        CommandManager.register(Strings.ADD_TO_GITIGNORE, CMD_ADD_TO_IGNORE, addItemToGitingore);
        CommandManager.register(Strings.REMOVE_FROM_GITIGNORE, CMD_REMOVE_FROM_IGNORE, removeItemFromGitingore);

        // create context menu for git panel
        const panelCmenu = Menus.registerContextMenu(Constants.GIT_PANEL_CHANGES_CMENU);
        CommandManager.register(Strings.ADD_TO_GITIGNORE, CMD_ADD_TO_IGNORE + "2", addItemToGitingoreFromPanel);
        CommandManager.register(Strings.REMOVE_FROM_GITIGNORE, CMD_REMOVE_FROM_IGNORE + "2", removeItemFromGitingoreFromPanel);
        panelCmenu.addMenuItem(CMD_ADD_TO_IGNORE + "2");
        panelCmenu.addMenuItem(CMD_REMOVE_FROM_IGNORE + "2");

        // create context menu for git history
        const historyCmenu = Menus.registerContextMenu(Constants.GIT_PANEL_HISTORY_CMENU);
        CommandManager.register(Strings.CHECKOUT_COMMIT, Constants.CMD_GIT_CHECKOUT, checkoutCommit);
        CommandManager.register(Strings.MENU_RESET_HARD, Constants.CMD_GIT_RESET_HARD, resetHard);
        CommandManager.register(Strings.MENU_RESET_MIXED, Constants.CMD_GIT_RESET_MIXED, resetMixed);
        CommandManager.register(Strings.MENU_RESET_SOFT, Constants.CMD_GIT_RESET_SOFT, resetSoft);
        CommandManager.register(Strings.MENU_TAG_COMMIT, Constants.CMD_GIT_TAG, tagCommit);
        historyCmenu.addMenuItem(Constants.CMD_GIT_CHECKOUT);
        historyCmenu.addMenuItem(Constants.CMD_GIT_TAG);
        historyCmenu.addMenuDivider();
        historyCmenu.addMenuItem(Constants.CMD_GIT_RESET_HARD);
        historyCmenu.addMenuItem(Constants.CMD_GIT_RESET_MIXED);
        historyCmenu.addMenuItem(Constants.CMD_GIT_RESET_SOFT);

        // create context menu for git more options
        const optionsCmenu = Menus.registerContextMenu(Constants.GIT_PANEL_OPTIONS_CMENU);
        Menus.ContextMenu.assignContextMenuToSelector(".git-more-options-btn", optionsCmenu);
        optionsCmenu.addMenuItem(Constants.CMD_GIT_DISCARD_ALL_CHANGES);
    }

    function init() {
        $icon.removeClass("loading").removeAttr("title");
        CommandManager.register(Strings.GIT_SETTINGS, Constants.CMD_GIT_SETTINGS_COMMAND_ID, SettingsDialog.show);
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

/*jslint plusplus: true, vars: true, nomen: true */
/*global $, brackets, define */

define(function (require, exports) {
    "use strict";

    const DocumentManager = brackets.getModule("document/DocumentManager"),
        Menus           = brackets.getModule("command/Menus"),
        Commands        = brackets.getModule("command/Commands"),
        CommandManager  = brackets.getModule("command/CommandManager"),
        MainViewManager = brackets.getModule("view/MainViewManager");

    const Events      = require("src/Events"),
        EventEmitter  = require("src/EventEmitter"),
        Git           = require("src/git/Git"),
        Preferences   = require("src/Preferences"),
        Strings       = require("strings");

    let closeUnmodifiedCmd, gitEnabled = false;

    const CMD_CLOSE_UNMODIFIED = "git-close-unmodified-files";

    function handleCloseNotModified() {
        Git.status().then(function (modifiedFiles) {
            var openFiles      = MainViewManager.getWorkingSet(MainViewManager.ALL_PANES),
                currentGitRoot = Preferences.get("currentGitRoot");

            openFiles.forEach(function (openFile) {
                var removeOpenFile = true;
                modifiedFiles.forEach(function (modifiedFile) {
                    if (currentGitRoot + modifiedFile.file === openFile.fullPath) {
                        removeOpenFile = false;
                    }
                });

                if (removeOpenFile) {
                    // check if file doesn't have any unsaved changes
                    const doc = DocumentManager.getOpenDocumentForPath(openFile.fullPath);
                    // document will not  be present for images, or if the file is in working set but
                    // no editor is attached yet(eg. session restore on app start)
                    if (!doc || !doc.isDirty) {
                        CommandManager.execute(Commands.FILE_CLOSE_LIST, {PaneId: MainViewManager.ALL_PANES, fileList: [openFile]});
                    }
                }
            });

            MainViewManager.focusActivePane();
        });
    }

    function updateMenuItemState() {
        if(!closeUnmodifiedCmd){
            return;
        }
        closeUnmodifiedCmd.setEnabled(gitEnabled);
    }

    function init() {
        closeUnmodifiedCmd       = CommandManager.register(Strings.CMD_CLOSE_UNMODIFIED,
            CMD_CLOSE_UNMODIFIED, handleCloseNotModified);
        const fileMenu = Menus.getMenu(Menus.AppMenuBar.FILE_MENU);
        fileMenu.addMenuItem(CMD_CLOSE_UNMODIFIED, undefined, Menus.AFTER, Commands.FILE_CLOSE_ALL, {
            hideWhenCommandDisabled: true
        });
        updateMenuItemState();
    }

    EventEmitter.on(Events.GIT_ENABLED, function () {
        gitEnabled = true;
        updateMenuItemState();
    });

    EventEmitter.on(Events.GIT_DISABLED, function () {
        gitEnabled = false;
        updateMenuItemState();
    });

    // Public API
    exports.init = init;
});

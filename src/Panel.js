/*jshint maxstatements:false*/

define(function (require, exports) {
    "use strict";

    const _                  = brackets.getModule("thirdparty/lodash"),
        CodeInspection     = brackets.getModule("language/CodeInspection"),
        CommandManager     = brackets.getModule("command/CommandManager"),
        Commands           = brackets.getModule("command/Commands"),
        Dialogs            = brackets.getModule("widgets/Dialogs"),
        DocumentManager    = brackets.getModule("document/DocumentManager"),
        EditorManager      = brackets.getModule("editor/EditorManager"),
        FileViewController = brackets.getModule("project/FileViewController"),
        FileSystem         = brackets.getModule("filesystem/FileSystem"),
        Menus              = brackets.getModule("command/Menus"),
        Mustache           = brackets.getModule("thirdparty/mustache/mustache"),
        FindInFiles        = brackets.getModule("search/FindInFiles"),
        WorkspaceManager   = brackets.getModule("view/WorkspaceManager"),
        ProjectManager     = brackets.getModule("project/ProjectManager"),
        StringUtils        = brackets.getModule("utils/StringUtils"),
        Constants          = require("src/Constants"),
        Git                = require("src/git/Git"),
        Events             = require("./Events"),
        EventEmitter       = require("./EventEmitter"),
        Preferences        = require("./Preferences"),
        ErrorHandler       = require("./ErrorHandler"),
        ExpectedError      = require("./ExpectedError"),
        Main               = require("./Main"),
        GutterManager      = require("./GutterManager"),
        Strings            = require("../strings"),
        Utils              = require("src/Utils"),
        SettingsDialog     = require("./SettingsDialog"),
        ProgressDialog     = require("src/dialogs/Progress");

    const gitPanelTemplate            = require("text!templates/git-panel.html"),
        gitPanelResultsTemplate     = require("text!templates/git-panel-results.html"),
        gitAuthorsDialogTemplate    = require("text!templates/authors-dialog.html"),
        gitCommitDialogTemplate     = require("text!templates/git-commit-dialog.html"),
        gitDiffDialogTemplate       = require("text!templates/git-diff-dialog.html"),
        questionDialogTemplate      = require("text!templates/git-question-dialog.html");

    var showFileWhiteList = /^\.gitignore$/;

    var COMMIT_MODE = {
        CURRENT: "CURRENT",
        ALL: "ALL",
        DEFAULT: "DEFAULT"
    };

    var gitPanel = null,
        $gitPanel = $(null),
        $mainToolbar,
        gitPanelDisabled = null,
        gitPanelMode = null,
        showingUntracked = true,
        $tableContainer = $(null),
        lastCommitMessage = {};

    function lintFile(filename) {
        var fullPath = Preferences.get("currentGitRoot") + filename,
            codeInspectionPromise;

        try {
            codeInspectionPromise = CodeInspection.inspectFile(FileSystem.getFileForPath(fullPath));
        } catch (e) {
            ErrorHandler.logError("CodeInspection.inspectFile failed to execute for file " + fullPath);
            ErrorHandler.logError(e);
            codeInspectionPromise = Promise.reject(e);
        }

        return jsPromise(codeInspectionPromise);
    }

    function _makeDialogBig($dialog) {
        var $wrapper = $dialog.parents(".modal-wrapper").first();
        if ($wrapper.length === 0) { return; }

        // We need bigger commit dialog
        var minWidth = 500,
            minHeight = 300,
            maxWidth = $wrapper.width(),
            maxHeight = $wrapper.height(),
            desiredWidth = maxWidth / 1.5,
            desiredHeight = maxHeight / 2;

        if (desiredWidth < minWidth) { desiredWidth = minWidth; }
        if (desiredHeight < minHeight) { desiredHeight = minHeight; }

        $dialog
            .width(desiredWidth)
            .children(".modal-body")
                .css("max-height", desiredHeight)
            .end();

        return { width: desiredWidth, height: desiredHeight };
    }

    function _showCommitDialog(stagedDiff, lintResults, prefilledMessage, commitMode, files) {
        lintResults = lintResults || [];

        // Flatten the error structure from various providers
        lintResults.forEach(function (lintResult) {
            lintResult.errors = [];
            if (Array.isArray(lintResult.result)) {
                lintResult.result.forEach(function (resultSet) {
                    if (!resultSet.result || !resultSet.result.errors) { return; }

                    var providerName = resultSet.provider.name;
                    resultSet.result.errors.forEach(function (e) {
                        lintResult.errors.push((e.pos.line + 1) + ": " + e.message + " (" + providerName + ")");
                    });
                });
            } else {
                ErrorHandler.logError("[brackets-git] lintResults contain object in unexpected format: " + JSON.stringify(lintResult));
            }
            lintResult.hasErrors = lintResult.errors.length > 0;
        });

        // Filter out only results with errors to show
        lintResults = _.filter(lintResults, function (lintResult) {
            return lintResult.hasErrors;
        });

        // Open the dialog
        var compiledTemplate = Mustache.render(gitCommitDialogTemplate, {
                Strings: Strings,
                hasLintProblems: lintResults.length > 0,
                lintResults: lintResults
            }),
            dialog           = Dialogs.showModalDialogUsingTemplate(compiledTemplate),
            $dialog          = dialog.getElement();

        // We need bigger commit dialog
        _makeDialogBig($dialog);

        // Show nicely colored commit diff
        $dialog.find(".commit-diff").append(Utils.formatDiff(stagedDiff));

        // Enable / Disable amend checkbox
        var toggleAmendCheckbox = function (bool) {
            $dialog.find(".amend-commit")
                .prop("disabled", !bool)
                .parent()
                .attr("title", !bool ? Strings.AMEND_COMMIT_FORBIDDEN : null);
        };
        toggleAmendCheckbox(false);

        Git.getCommitCounts()
            .then(function (commits) {
                var hasRemote = $gitPanel.find(".git-selected-remote").data("remote") != null;
                var hasCommitsAhead = commits.ahead > 0;
                toggleAmendCheckbox(!hasRemote || hasRemote && hasCommitsAhead);
            })
            .catch(function (err) {
                ErrorHandler.logError(err);
            });

        function getCommitMessageElement() {
            var r = $dialog.find("[name='commit-message']:visible");
            if (r.length !== 1) {
                r = $dialog.find("[name='commit-message']");
                for (var i = 0; i < r.length; i++) {
                    if ($(r[i]).css("display") !== "none") {
                        return $(r[i]);
                    }
                }
            }
            return r;
        }

        var $commitMessageCount = $dialog.find("input[name='commit-message-count']");

        // Add event to count characters in commit message
        var recalculateMessageLength = function () {
            var val = getCommitMessageElement().val().trim(),
                length = val.length;

            if (val.indexOf("\n")) {
                // longest line
                length = Math.max.apply(null, val.split("\n").map(function (l) { return l.length; }));
            }

            $commitMessageCount
                .val(length)
                .toggleClass("over50", length > 50 && length <= 100)
                .toggleClass("over100", length > 100);
        };

        var usingTextArea = false;

        // commit message handling
        function switchCommitMessageElement() {
            usingTextArea = !usingTextArea;

            var findStr = "[name='commit-message']",
                currentValue = $dialog.find(findStr + ":visible").val();
            $dialog.find(findStr).toggle();
            $dialog.find(findStr + ":visible")
                .val(currentValue)
                .focus();
            recalculateMessageLength();
        }

        $dialog.find("button.primary").on("click", function (e) {
            var $commitMessage = getCommitMessageElement();
            if ($commitMessage.val().trim().length === 0) {
                e.stopPropagation();
                $commitMessage.addClass("invalid");
            } else {
                $commitMessage.removeClass("invalid");
            }
        });

        $dialog.find("button.extendedCommit").on("click", function () {
            switchCommitMessageElement();
            // this value will be set only when manually triggered
            Preferences.set("useTextAreaForCommitByDefault", usingTextArea);
        });

        function prefillMessage(msg) {
            if (msg.indexOf("\n") !== -1 && !usingTextArea) {
                switchCommitMessageElement();
            }
            $dialog.find("[name='commit-message']:visible").val(msg);
            recalculateMessageLength();
        }

        // Assign action to amend checkbox
        $dialog.find(".amend-commit").on("click", function () {
            if ($(this).prop("checked") === false) {
                prefillMessage("");
            } else {
                Git.getLastCommitMessage().then(function (msg) {
                    prefillMessage(msg);
                });
            }
        });

        if (Preferences.get("useTextAreaForCommitByDefault")) {
            switchCommitMessageElement();
        }

        if (prefilledMessage) {
            prefillMessage(prefilledMessage.trim());
        }

        // Add focus to commit message input
        getCommitMessageElement().focus();

        $dialog.find("[name='commit-message']")
            .on("keyup", recalculateMessageLength)
            .on("change", recalculateMessageLength);
        recalculateMessageLength();

        dialog.done(function (buttonId) {
            const commitMessageElement = getCommitMessageElement();
            if(commitMessageElement){
                lastCommitMessage[ProjectManager.getProjectRoot().fullPath] = commitMessageElement.val();
            }
            if (buttonId === "ok") {
                if (commitMode === COMMIT_MODE.ALL || commitMode === COMMIT_MODE.CURRENT) {
                    var filePaths = _.map(files, function (next) {
                        return next.file;
                    });
                    Git.stage(filePaths)
                    .then(function () {
                        return _getStagedDiff();
                    })
                    .then(function (diff) {
                        _doGitCommit($dialog, getCommitMessageElement, diff);
                    })
                    .catch(function (err) {
                        ErrorHandler.showError(err, "Cant get diff for staged files");
                    });
                } else {
                    _doGitCommit($dialog, getCommitMessageElement, stagedDiff);
                }
            } else {
                Git.status();
            }
        });
    }

    function _doGitCommit($dialog, getCommitMessageElement, stagedDiff) {
        // this event won't launch when commit-message is empty so its safe to assume that it is not
        var commitMessage = getCommitMessageElement().val(),
            amendCommit = $dialog.find(".amend-commit").prop("checked"),
            noVerify = $dialog.find(".commit-no-verify").prop("checked");

        // if commit message is extended and has a newline, put an empty line after first line to separate subject and body
        var s = commitMessage.split("\n");
        if (s.length > 1 && s[1].trim() !== "") {
            s.splice(1, 0, "");
        }
        commitMessage = s.join("\n");

        // save lastCommitMessage in case the commit will fail
        lastCommitMessage[ProjectManager.getProjectRoot().fullPath] = commitMessage;

        // now we are going to be paranoid and we will check if some mofo didn't change our diff
        _getStagedDiff().then(function (diff) {
            if (diff === stagedDiff) {
                return Git.commit(commitMessage, amendCommit, noVerify).then(function () {
                    // clear lastCommitMessage because the commit was successful
                    lastCommitMessage[ProjectManager.getProjectRoot().fullPath] = null;
                });
            } else {
                throw new ExpectedError("The files you were going to commit were modified while commit dialog was displayed. " +
                                        "Aborting the commit as the result would be different then what was shown in the dialog.");
            }
        }).catch(function (err) {
            if (ErrorHandler.contains(err, "Please tell me who you are")) {
                return new Promise((resolve)=>{
                    EventEmitter.emit(Events.GIT_CHANGE_USERNAME, function () {
                        EventEmitter.emit(Events.GIT_CHANGE_EMAIL, function () {
                            resolve();
                        });
                    });
                });
            }

            ErrorHandler.showError(err, "Git Commit failed");

        }).finally(function () {
            EventEmitter.emit(Events.GIT_COMMITED);
            refresh();
        });
    }

    function _showAuthors(file, blame, fromLine, toLine) {
        var linesTotal = blame.length;
        var blameStats = blame.reduce(function (stats, lineInfo) {
            var name = lineInfo.author + " " + lineInfo["author-mail"];
            if (stats[name]) {
                stats[name] += 1;
            } else {
                stats[name] = 1;
            }
            return stats;
        }, {});
        blameStats = _.reduce(blameStats, function (arr, val, key) {
            arr.push({
                authorName: key,
                lines: val,
                percentage: Math.round(val / (linesTotal / 100))
            });
            return arr;
        }, []);
        blameStats = _.sortBy(blameStats, "lines").reverse();

        if (fromLine || toLine) {
            file += " (" + Strings.LINES + " " + fromLine + "-" + toLine + ")";
        }

        var compiledTemplate = Mustache.render(gitAuthorsDialogTemplate, {
                file: file,
                blameStats: blameStats,
                Strings: Strings
            });
        Dialogs.showModalDialogUsingTemplate(compiledTemplate);
    }

    function _getCurrentFilePath(editor) {
        var gitRoot = Preferences.get("currentGitRoot"),
            document = editor ? editor.document : DocumentManager.getCurrentDocument(),
            filePath = document.file.fullPath;
        if (filePath.indexOf(gitRoot) === 0) {
            filePath = filePath.substring(gitRoot.length);
        }
        return filePath;
    }

    function handleAuthorsSelection() {
        var editor = EditorManager.getActiveEditor(),
            filePath = _getCurrentFilePath(editor),
            currentSelection = editor.getSelection(),
            fromLine = currentSelection.start.line + 1,
            toLine = currentSelection.end.line + 1;

        // fix when nothing is selected on that line
        if (currentSelection.end.ch === 0) { toLine = toLine - 1; }

        var isSomethingSelected = currentSelection.start.line !== currentSelection.end.line ||
                                  currentSelection.start.ch !== currentSelection.end.ch;
        if (!isSomethingSelected) {
            ErrorHandler.showError(new ExpectedError(Strings.ERROR_NOTHING_SELECTED));
            return;
        }

        if (editor.document.isDirty) {
            ErrorHandler.showError(new ExpectedError(Strings.ERROR_SAVE_FIRST));
            return;
        }

        Git.getBlame(filePath, fromLine, toLine).then(function (blame) {
            return _showAuthors(filePath, blame, fromLine, toLine);
        }).catch(function (err) {
            ErrorHandler.showError(err, "Git Blame failed");
        });
    }

    function handleAuthorsFile() {
        var filePath = _getCurrentFilePath();
        Git.getBlame(filePath).then(function (blame) {
            return _showAuthors(filePath, blame);
        }).catch(function (err) {
            ErrorHandler.showError(err, "Git Blame failed");
        });
    }

    function handleGitDiff(file) {
        if (Preferences.get("useDifftool")) {
            Git.difftool(file);
        } else {
            Git.diffFileNice(file).then(function (diff) {
                // show the dialog with the diff
                var compiledTemplate = Mustache.render(gitDiffDialogTemplate, { file: file, Strings: Strings }),
                    dialog           = Dialogs.showModalDialogUsingTemplate(compiledTemplate),
                    $dialog          = dialog.getElement();
                _makeDialogBig($dialog);
                $dialog.find(".commit-diff").append(Utils.formatDiff(diff));
            }).catch(function (err) {
                ErrorHandler.showError(err, "Git Diff failed");
            });
        }
    }

    function handleGitUndo(file) {
        var compiledTemplate = Mustache.render(questionDialogTemplate, {
            title: Strings.UNDO_CHANGES,
            question: StringUtils.format(Strings.Q_UNDO_CHANGES, _.escape(file)),
            Strings: Strings
        });
        Dialogs.showModalDialogUsingTemplate(compiledTemplate).done(function (buttonId) {
            if (buttonId === "ok") {
                Git.discardFileChanges(file).then(function () {
                    var gitRoot = Preferences.get("currentGitRoot");
                    DocumentManager.getAllOpenDocuments().forEach(function (doc) {
                        if (doc.file.fullPath === gitRoot + file) {
                            Utils.reloadDoc(doc);
                        }
                    });
                    refresh();
                }).catch(function (err) {
                    ErrorHandler.showError(err, "Discard changes to a file failed");
                });
            }
        });
    }

    function handleGitDelete(file) {
        FileSystem.resolve(Preferences.get("currentGitRoot") + file, function (err, fileEntry) {
            if (err) {
                ErrorHandler.showError(err, "Could not resolve file");
                return;
            }
            CommandManager.execute(Commands.FILE_DELETE, {file: fileEntry});
        });
    }

    function _getStagedDiff(commitMode, files) {
        const tracker = ProgressDialog.newProgressTracker();
        // todo git wire tracker
        return ProgressDialog.show(_getStagedDiffForCommitMode(commitMode, files), tracker, {
            title: Strings.GETTING_STAGED_DIFF_PROGRESS,
            options: { preDelay: 3, postDelay: 1 }
        })
        .catch(function (err) {
            if (ErrorHandler.contains(err, "cleanup")) {
                return false; // will display list of staged files instead
            }
            throw err;
        })
        .then(function (diff) {
            if (!diff) {
                return Git.getListOfStagedFiles().then(function (filesList) {
                    return Strings.DIFF_FAILED_SEE_FILES + "\n\n" + filesList;
                });
            }
            return diff;
        });
    }

    function _getStagedDiffForCommitMode(commitMode, files) {

        if (commitMode === COMMIT_MODE.ALL) {
            return _getStaggedDiffForAllFiles();
        }

        if (commitMode === COMMIT_MODE.CURRENT && _.isArray(files)) {
            if (files.length > 1) {
                return Promise.reject("_getStagedDiffForCommitMode() got files.length > 1");
            }

            var isUntracked = files[0].status.indexOf(Git.FILE_STATUS.UNTRACKED) !== -1;
            if (isUntracked) {
                return _getDiffForUntrackedFiles(files[0].file);
            } else {
                return Git.getDiffOfAllIndexFiles(files[0].file);
            }
        }

        return Git.getDiffOfStagedFiles();
    }

    function _getStaggedDiffForAllFiles() {
        return Git.status().then(function (statusFiles) {
            var untrackedFiles = [];
            var fileArray = [];

            statusFiles.forEach(function (fileObject) {
                var isUntracked = fileObject.status.indexOf(Git.FILE_STATUS.UNTRACKED) !== -1;
                if (isUntracked) {
                    untrackedFiles.push(fileObject.file);
                } else {
                    fileArray.push(fileObject.file);
                }
            });

            if (untrackedFiles.length > 0) {
                return _getDiffForUntrackedFiles(fileArray.concat(untrackedFiles));
            } else {
                return Git.getDiffOfAllIndexFiles(fileArray);
            }
        });
    }

    function _getDiffForUntrackedFiles(files) {
        var diff;
        return Git.stage(files, false)
            .then(function () {
                return Git.getDiffOfStagedFiles();
            })
            .then(function (_diff) {
                diff = _diff;
                return Git.resetIndex();
            })
            .then(function () {
                return diff;
            });
    }

    // whatToDo gets values "continue" "skip" "abort"
    function handleRebase(whatToDo) {
        Git.rebase(whatToDo).then(function () {
            EventEmitter.emit(Events.REFRESH_ALL);
        }).catch(function (err) {
            ErrorHandler.showError(err, "Rebase " + whatToDo + " failed");
        });
    }

    function abortMerge() {
        Git.discardAllChanges().then(function () {
            EventEmitter.emit(Events.REFRESH_ALL);
        }).catch(function (err) {
            ErrorHandler.showError(err, "Merge abort failed");
        });
    }

    function findConflicts() {
        FindInFiles.doSearch(/^<<<<<<<\s|^=======\s|^>>>>>>>\s/gm);
    }

    function commitMerge() {
        Utils.loadPathContent(Preferences.get("currentGitRoot") + "/.git/MERGE_MSG").then(function (msg) {
            handleGitCommit(msg, true, COMMIT_MODE.DEFAULT);
            EventEmitter.once(Events.GIT_COMMITED, function () {
                EventEmitter.emit(Events.REFRESH_ALL);
            });
        }).catch(function (err) {
            ErrorHandler.showError(err, "Merge commit failed");
        });
    }

    function inspectFiles(gitStatusResults) {
        var lintResults = [];

        var codeInspectionPromises = gitStatusResults.map(function (fileObj) {
            var isDeleted = fileObj.status.indexOf(Git.FILE_STATUS.DELETED) !== -1;

            // do a code inspection for the file, if it was not deleted
            if (!isDeleted) {
                return lintFile(fileObj.file)
                    .catch(function () {
                        return [
                            {
                                provider: { name: "See console [F12] for details" },
                                result: {
                                    errors: [
                                        {
                                            pos: { line: 0, ch: 0 },
                                            message: "CodeInspection failed to execute for this file."
                                        }
                                    ]
                                }
                            }
                        ];
                    })
                    .then(function (result) {
                        if (result) {
                            lintResults.push({
                                filename: fileObj.file,
                                result: result
                            });
                        }
                    });
            }
        });

        return Promise.all(_.compact(codeInspectionPromises)).then(function () {
            return lintResults;
        });
    }

    function handleGitCommit(prefilledMessage, isMerge, commitMode) {
        if(Utils.isLoading($gitPanel.find(".git-commit"))){
            return;
        }

        var stripWhitespace = Preferences.get("stripWhitespaceFromCommits");
        var codeInspectionEnabled = Preferences.get("useCodeInspection");

        // Disable button (it will be enabled when selecting files after reset)
        Utils.setLoading($gitPanel.find(".git-commit"));

        var p;

        // First reset staged files, then add selected files to the index.
        if (commitMode === COMMIT_MODE.DEFAULT) {
            p = Git.status().then(function (files) {
                files = _.filter(files, function (file) {
                    return file.status.indexOf(Git.FILE_STATUS.STAGED) !== -1;
                });

                if (files.length === 0 && !isMerge) {
                    return ErrorHandler.showError(
                        new Error("Commit button should have been disabled"),
                        "Nothing staged to commit"
                    );
                }

                return handleGitCommitInternal(stripWhitespace,
                                               files,
                                               codeInspectionEnabled,
                                               commitMode,
                                               prefilledMessage);
            });
        } else if (commitMode === COMMIT_MODE.ALL) {
            p = Git.status().then(function (files) {
                return handleGitCommitInternal(stripWhitespace,
                                               files,
                                               codeInspectionEnabled,
                                               commitMode,
                                               prefilledMessage);
            });
        } else if (commitMode === COMMIT_MODE.CURRENT) {
            p = Git.status().then(function (files) {
                var gitRoot = Preferences.get("currentGitRoot");
                var currentDoc = DocumentManager.getCurrentDocument();
                if (currentDoc) {
                    var relativePath = currentDoc.file.fullPath.substring(gitRoot.length);
                    var currentFile = _.filter(files, function (next) {
                        return relativePath === next.file;
                    });
                    return handleGitCommitInternal(stripWhitespace, currentFile, codeInspectionEnabled, commitMode, prefilledMessage);
                }
            });
        }

        p.catch(function (err) {
            ErrorHandler.showError(err, "Preparing commit dialog failed");
        }).finally(function () {
            Utils.unsetLoading($gitPanel.find(".git-commit"));
        });

    }

    function handleGitCommitInternal(stripWhitespace, files, codeInspectionEnabled, commitMode, prefilledMessage) {
        var queue = Promise.resolve();
        var lintResults;

        if (stripWhitespace) {
            queue = queue.then(function () {
                const tracker = ProgressDialog.newProgressTracker();
                return ProgressDialog.show(
                    Utils.stripWhitespaceFromFiles(files, commitMode === COMMIT_MODE.DEFAULT, tracker),
                    tracker, {
                        title: Strings.CLEANING_WHITESPACE_PROGRESS,
                        options: { preDelay: 3, postDelay: 1 }
                    }
                );
            });
        }

        if (codeInspectionEnabled) {
            queue = queue.then(function () {
                return inspectFiles(files).then(function (_lintResults) {
                    lintResults = _lintResults;
                });
            });
        }

        return queue.then(function () {
            // All files are in the index now, get the diff and show dialog.
            return _getStagedDiff(commitMode, files).then(function (diff) {
                return _showCommitDialog(diff, lintResults, prefilledMessage, commitMode, files);
            });
        });
    }

    function refreshCurrentFile() {
        var gitRoot = Preferences.get("currentGitRoot");
        var currentDoc = DocumentManager.getCurrentDocument();
        if (currentDoc) {
            $gitPanel.find("tr").each(function () {
                var currentFullPath = currentDoc.file.fullPath,
                    thisFile = $(this).attr("x-file");
                $(this).toggleClass("selected", gitRoot + thisFile === currentFullPath);
            });
        } else {
            $gitPanel.find("tr").removeClass("selected");
        }
    }

    function shouldShow(fileObj) {
        if (showFileWhiteList.test(fileObj.name)) {
            return true;
        }
        return ProjectManager.shouldShow(fileObj);
    }

    function _refreshTableContainer(files) {
        if (!gitPanel.isVisible()) {
            return;
        }

        // remove files that we should not show
        files = _.filter(files, function (file) {
            return shouldShow(file);
        });

        var allStaged = files.length > 0 && _.all(files, function (file) { return file.status.indexOf(Git.FILE_STATUS.STAGED) !== -1; });
        $gitPanel.find(".check-all").prop("checked", allStaged).prop("disabled", files.length === 0);

        var $editedList = $tableContainer.find(".git-edited-list");
        var visibleBefore = $editedList.length ? $editedList.is(":visible") : true;
        $editedList.remove();

        if (files.length === 0) {
            $tableContainer.append($("<p class='git-edited-list nothing-to-commit' />").text(Strings.NOTHING_TO_COMMIT));
        } else {
            // if desired, remove untracked files from the results
            if (showingUntracked === false) {
                files = _.filter(files, function (file) {
                    return file.status.indexOf(Git.FILE_STATUS.UNTRACKED) === -1;
                });
            }
            // -
            files.forEach(function (file) {
                file.staged = file.status.indexOf(Git.FILE_STATUS.STAGED) !== -1;
                file.statusText = file.status.map(function (status) {
                    return Strings["FILE_" + status];
                }).join(", ");
                file.allowDiff = file.status.indexOf(Git.FILE_STATUS.UNTRACKED) === -1 &&
                                 file.status.indexOf(Git.FILE_STATUS.RENAMED) === -1 &&
                                 file.status.indexOf(Git.FILE_STATUS.DELETED) === -1;
                file.allowDelete = file.status.indexOf(Git.FILE_STATUS.UNTRACKED) !== -1 ||
                                   file.status.indexOf(Git.FILE_STATUS.STAGED) !== -1 &&
                                   file.status.indexOf(Git.FILE_STATUS.ADDED) !== -1;
                file.allowUndo = !file.allowDelete;
            });
            $tableContainer.append(Mustache.render(gitPanelResultsTemplate, {
                files: files,
                Strings: Strings
            }));

            refreshCurrentFile();
        }
        $tableContainer.find(".git-edited-list").toggle(visibleBefore);
    }

    function _setName(commandID, newName) {
        const command = CommandManager.get(commandID);
        if (command) {
            command.setName(newName);
        }
    }

    function refreshCommitCounts() {
        // Find Push and Pull buttons
        var $pullBtn = $gitPanel.find(".git-pull");
        var $pushBtn = $gitPanel.find(".git-push");
        var clearCounts = function () {
            $pullBtn.children("span").remove();
            $pushBtn.children("span").remove();
            _setName(Constants.CMD_GIT_PULL, Strings.PULL_SHORTCUT);
            _setName(Constants.CMD_GIT_PUSH, Strings.PUSH_SHORTCUT);
        };

        // Check if there's a remote, resolve if there's not
        var remotes = Preferences.get("defaultRemotes") || {};
        var defaultRemote = remotes[Preferences.get("currentGitRoot")];
        if (!defaultRemote) {
            clearCounts();
            return Promise.resolve();
        }

        // Get the commit counts and append them to the buttons
        return Git.getCommitCounts().then(function (commits) {
            clearCounts();
            if (commits.behind > 0) {
                $pullBtn.append($("<span/>").text(" (" + commits.behind + ")"));
                _setName(Constants.CMD_GIT_PULL,
                    StringUtils.format(Strings.PULL_SHORTCUT_BEHIND, commits.behind));
            }
            if (commits.ahead > 0) {
                $pushBtn.append($("<span/>").text(" (" + commits.ahead + ")"));
                _setName(Constants.CMD_GIT_PUSH,
                    StringUtils.format(Strings.PUSH_SHORTCUT_AHEAD, commits.ahead));
            }
        }).catch(function (err) {
            clearCounts();
            ErrorHandler.logError(err);
        });
    }

    function refresh() {
        // set the history panel to false and remove the class that show the button history active when refresh
        $gitPanel.find(".git-history-toggle").removeClass("active").attr("title", Strings.TOOLTIP_SHOW_HISTORY);
        $gitPanel.find(".git-file-history").removeClass("active").attr("title", Strings.TOOLTIP_SHOW_FILE_HISTORY);

        if (gitPanelMode === "not-repo") {
            $tableContainer.empty();
            return Promise.resolve();
        }

        $tableContainer.find("#git-history-list").remove();
        $tableContainer.find(".git-edited-list").show();

        var p1 = Git.status().catch(function (err) {
            // this is an expected "error"
            if (ErrorHandler.contains(err, "Not a git repository")) {
                return;
            }
        });

        var p2 = refreshCommitCounts();

        // Clone button
        $gitPanel.find(".git-clone").prop("disabled", false);

        // FUTURE: who listens for this?
        return Promise.all([p1, p2]);
    }

    function toggle(bool) {
        if (gitPanelDisabled === true) {
            return;
        }
        if (typeof bool !== "boolean") {
            bool = !gitPanel.isVisible();
        }
        Preferences.set("panelEnabled", bool);
        Main.$icon.toggleClass("on", bool);
        gitPanel.setVisible(bool);

        // Mark menu item as enabled/disabled.
        CommandManager.get(Constants.CMD_GIT_TOGGLE_PANEL).setChecked(bool);

        if (bool) {
            refresh();
        }
    }

    function handleToggleUntracked() {
        showingUntracked = !showingUntracked;
        const command = CommandManager.get(Constants.CMD_GIT_TOGGLE_UNTRACKED);
        if (command) {
            command.setChecked(!showingUntracked);
        }

        refresh();
    }

    function commitCurrentFile() {
        // do not return anything here, core expects jquery promise
        jsPromise(CommandManager.execute("file.save"))
            .then(function () {
                return Git.resetIndex();
            })
            .then(function () {
                return handleGitCommit(lastCommitMessage[ProjectManager.getProjectRoot().fullPath], false, COMMIT_MODE.CURRENT);
            });
    }

    function commitAllFiles() {
        // do not return anything here, core expects jquery promise
        jsPromise(CommandManager.execute("file.saveAll"))
            .then(function () {
                return Git.resetIndex();
            })
            .then(function () {
                return handleGitCommit(lastCommitMessage[ProjectManager.getProjectRoot().fullPath], false, COMMIT_MODE.ALL);
            });
    }

    // Disable "commit" button if there aren't staged files to commit
    function _toggleCommitButton(files) {
        var anyStaged = _.any(files, function (file) { return file.status.indexOf(Git.FILE_STATUS.STAGED) !== -1; });
        $gitPanel.find(".git-commit").prop("disabled", !anyStaged);
    }

    EventEmitter.on(Events.GIT_STATUS_RESULTS, function (results) {
        _refreshTableContainer(results);
        _toggleCommitButton(results);
    });

    function undoLastLocalCommit() {
        return Utils.askQuestion(Strings.UNDO_COMMIT, Strings.UNDO_LOCAL_COMMIT_CONFIRM, {booleanResponse: true})
            .then(function (response) {
                if (response) {
                    Git.undoLastLocalCommit()
                        .catch(function (err) {
                            ErrorHandler.showError(err, "Impossible to undo last commit");
                        })
                        .finally(function () {
                            refresh();
                        });
                }
            });
    }

    var lastCheckOneClicked = null;

    function attachDefaultTableHandlers() {
        $tableContainer = $gitPanel.find(".table-container")
            .off()
            .on("click", ".check-one", function (e) {
                e.stopPropagation();
                var $tr = $(this).closest("tr"),
                    file = $tr.attr("x-file"),
                    status = $tr.attr("x-status"),
                    isChecked = $(this).is(":checked");

                if (e.shiftKey) {
                    // stage/unstage all file between
                    var lc = lastCheckOneClicked.localeCompare(file),
                        lcClickedSelector = "[x-file='" + lastCheckOneClicked + "']",
                        sequence;

                    if (lc < 0) {
                        sequence = $tr.prevUntil(lcClickedSelector).andSelf();
                    } else if (lc > 0) {
                        sequence = $tr.nextUntil(lcClickedSelector).andSelf();
                    }

                    if (sequence) {
                        sequence = sequence.add($tr.parent().children(lcClickedSelector));
                        var promises = sequence.map(function () {
                            var $this = $(this),
                                method = isChecked ? "stage" : "unstage",
                                file = $this.attr("x-file"),
                                status = $this.attr("x-status");
                            return Git[method](file, status === Git.FILE_STATUS.DELETED);
                        }).toArray();
                        return Promise.all(promises).then(function () {
                            return Git.status();
                        }).catch(function (err) {
                            ErrorHandler.showError(err, "Modifying file status failed");
                        });
                    }
                }

                lastCheckOneClicked = file;

                if (isChecked) {
                    Git.stage(file, status === Git.FILE_STATUS.DELETED).then(function () {
                        Git.status();
                    });
                } else {
                    Git.unstage(file).then(function () {
                        Git.status();
                    });
                }
            })
            .on("dblclick", ".check-one", function (e) {
                e.stopPropagation();
            })
            .on("click", ".btn-git-diff", function (e) {
                e.stopPropagation();
                handleGitDiff($(e.target).closest("tr").attr("x-file"));
            })
            .on("click", ".btn-git-undo", function (e) {
                e.stopPropagation();
                handleGitUndo($(e.target).closest("tr").attr("x-file"));
            })
            .on("click", ".btn-git-delete", function (e) {
                e.stopPropagation();
                handleGitDelete($(e.target).closest("tr").attr("x-file"));
            })
            .on("mousedown", ".modified-file", function (e) {
                var $this = $(e.currentTarget);
                // we listen on mousedown event for faster file switch perception. but this results in
                // this handler getting triggered before the above click handlers for table buttons and
                // Check boxes. So we do a check to see if the clicked element is NOT a button,
                // input, or tag inside a button.
                if ($(e.target).is("button, input") || $(e.target).closest("button").length) {
                    return;
                }
                if ($this.attr("x-status") === Git.FILE_STATUS.DELETED) {
                    return;
                }
                CommandManager.execute(Commands.FILE_OPEN, {
                    fullPath: Preferences.get("currentGitRoot") + $this.attr("x-file")
                });
            })
            .on("dblclick", ".modified-file", function (e) {
                var $this = $(e.currentTarget);
                if ($this.attr("x-status") === Git.FILE_STATUS.DELETED) {
                    return;
                }
                FileViewController.addToWorkingSetAndSelect(Preferences.get("currentGitRoot") + $this.attr("x-file"));
            });

    }

    EventEmitter.on(Events.GIT_CHANGE_USERNAME, function (callback) {
        return Git.getConfig("user.name").then(function (currentUserName) {
            return Utils.askQuestion(Strings.CHANGE_USER_NAME_TITLE, Strings.ENTER_NEW_USER_NAME, { defaultValue: currentUserName })
                .then(function (userName) {
                    if (!userName.length) { userName = currentUserName; }
                    return Git.setConfig("user.name", userName, true).catch(function (err) {
                        ErrorHandler.showError(err, "Impossible to change username");
                    }).then(function () {
                        EventEmitter.emit(Events.GIT_USERNAME_CHANGED, userName);
                    }).finally(function () {
                        if (callback) {
                            callback(userName);
                        }
                    });
                });
        });
    });

    EventEmitter.on(Events.GIT_CHANGE_EMAIL, function (callback) {
        return Git.getConfig("user.email").then(function (currentUserEmail) {
            return Utils.askQuestion(Strings.CHANGE_USER_EMAIL_TITLE, Strings.ENTER_NEW_USER_EMAIL, { defaultValue: currentUserEmail })
                .then(function (userEmail) {
                    if (!userEmail.length) { userEmail = currentUserEmail; }
                    return Git.setConfig("user.email", userEmail, true).catch(function (err) {
                        ErrorHandler.showError(err, "Impossible to change user email");
                    }).then(function () {
                        EventEmitter.emit(Events.GIT_EMAIL_CHANGED, userEmail);
                    }).finally(function () {
                        if (callback) {
                            callback(userEmail);
                        }
                    });
                });
        });
    });

    EventEmitter.on(Events.GERRIT_TOGGLE_PUSH_REF, function () {
        // update preference and emit so the menu item updates
        return Git.getConfig("gerrit.pushref").then(function (strEnabled) {
            var toggledValue = strEnabled !== "true";

            // Set the global preference
            // Saving a preference to tell the GitCli.push() method to check for gerrit push ref enablement
            // so we don't slow down people who aren't using gerrit.
            Preferences.set("gerritPushref", toggledValue);

            return Git.setConfig("gerrit.pushref", toggledValue, true)
                .then(function () {
                    EventEmitter.emit(Events.GERRIT_PUSH_REF_TOGGLED, toggledValue);
                });
        }).catch(function (err) {
            ErrorHandler.showError(err, "Impossible to toggle gerrit push ref");
        });
    });

    EventEmitter.on(Events.GERRIT_PUSH_REF_TOGGLED, function (enabled) {
        setGerritCheckState(enabled);
    });

    function setGerritCheckState(enabled) {
        const command = CommandManager.get(Constants.CMD_GIT_GERRIT_PUSH_REF);
        if (command) {
            command.setChecked(enabled);
        }
    }

    function discardAllChanges() {
        return Utils.askQuestion(Strings.RESET_LOCAL_REPO, Strings.RESET_LOCAL_REPO_CONFIRM, {
            booleanResponse: true, customOkBtn: Strings.DISCARD_CHANGES, customOkBtnClass: "danger"})
            .then(function (response) {
                if (response) {
                    return Git.discardAllChanges().catch(function (err) {
                        ErrorHandler.showError(err, "Reset of local repository failed");
                    }).then(function () {
                        refresh();
                    });
                }
            });
    }

    /**
     * Retrieves the hash of the selected history commit in the panel. if panel not visible
     * or if there is no selection, returns null.
     *
     * @returns {{hash: string, subject: string}|{}} The `hash` value and commit string
     *              of the selected history commit if visible, otherwise {}.
     */
    function getSelectedHistoryCommit() {
        const $historyRow = $(".history-commit.selected");
        if($historyRow.is(":visible")){
            return {
                hash: $historyRow.attr("x-hash"),
                subject: $historyRow.find(".commit-subject").text()
            };
        }
        return {};
    }

    function _panelResized(_entries) {
        if(!$mainToolbar || !$mainToolbar.is(":visible")){
            return;
        }
        const mainToolbarWidth = $mainToolbar.width();
        let overFlowWidth = 565;
        const breakpoints = [
            { width: overFlowWidth, className: "hide-when-small" },
            { width: 400, className: "hide-when-x-small" }
        ];

        if(mainToolbarWidth < overFlowWidth) {
            $gitPanel.find(".mainToolbar").addClass("hide-overflow");
        } else {
            $gitPanel.find(".mainToolbar").removeClass("hide-overflow");
        }
        breakpoints.forEach(bp => {
            if (mainToolbarWidth < bp.width) {
                $gitPanel.find(`.${bp.className}`).addClass("forced-hidden");
            } else {
                $gitPanel.find(`.${bp.className}`).removeClass("forced-hidden");
            }
        });
    }

    function init() {
        // Add panel
        var panelHtml = Mustache.render(gitPanelTemplate, {
            S: Strings
        });
        var $panelHtml = $(panelHtml);
        $panelHtml.find(".git-available, .git-not-available").hide();

        gitPanel = WorkspaceManager.createBottomPanel("main-git.panel", $panelHtml, 100);
        $gitPanel = gitPanel.$panel;
        const resizeObserver = new ResizeObserver(_panelResized);
        resizeObserver.observe($gitPanel[0]);
        $mainToolbar = $gitPanel.find(".mainToolbar");
        $gitPanel
            .on("click", ".close", toggle)
            .on("click", ".check-all", function () {
                if ($(this).is(":checked")) {
                    return Git.stageAll().then(function () {
                        Git.status();
                    });
                } else {
                    return Git.resetIndex().then(function () {
                        Git.status();
                    });
                }
            })
            .on("click", ".git-refresh", EventEmitter.getEmitter(Events.REFRESH_ALL))
            .on("click", ".git-commit", EventEmitter.getEmitter(Events.HANDLE_GIT_COMMIT))
            .on("click", ".git-rebase-continue", function (e) { handleRebase("continue", e); })
            .on("click", ".git-rebase-skip", function (e) { handleRebase("skip", e); })
            .on("click", ".git-rebase-abort", function (e) { handleRebase("abort", e); })
            .on("click", ".git-commit-merge", commitMerge)
            .on("click", ".git-merge-abort", abortMerge)
            .on("click", ".git-find-conflicts", findConflicts)
            .on("click", ".git-prev-gutter", GutterManager.goToPrev)
            .on("click", ".git-next-gutter", GutterManager.goToNext)
            .on("click", ".git-file-history", EventEmitter.getEmitter(Events.HISTORY_SHOW_FILE))
            .on("click", ".git-history-toggle", EventEmitter.getEmitter(Events.HISTORY_SHOW_GLOBAL))
            .on("click", ".git-fetch", EventEmitter.getEmitter(Events.HANDLE_FETCH))
            .on("click", ".git-push", function () {
                var typeOfRemote = $(this).attr("x-selected-remote-type");
                if (typeOfRemote === "git") {
                    EventEmitter.emit(Events.HANDLE_PUSH);
                }
            })
            .on("click", ".git-pull", EventEmitter.getEmitter(Events.HANDLE_PULL))
            .on("click", ".git-init", EventEmitter.getEmitter(Events.HANDLE_GIT_INIT))
            .on("click", ".git-clone", EventEmitter.getEmitter(Events.HANDLE_GIT_CLONE))
            .on("click", ".change-remote", EventEmitter.getEmitter(Events.HANDLE_REMOTE_PICK))
            .on("click", ".remove-remote", EventEmitter.getEmitter(Events.HANDLE_REMOTE_DELETE))
            .on("click", ".git-remote-new", EventEmitter.getEmitter(Events.HANDLE_REMOTE_CREATE))
            .on("contextmenu", "tr", function (e) {
                const $this = $(this);
                if ($this.hasClass("history-commit")) {
                    if(!$this.hasClass("selected")){
                        $this.click();
                    }
                    Menus.getContextMenu(Constants.GIT_PANEL_HISTORY_CMENU).open(e);
                    return;
                }

                $this.click();
                setTimeout(function () {
                    Menus.getContextMenu(Constants.GIT_PANEL_CHANGES_CMENU).open(e);
                }, 1);
            });

        // Attaching table handlers
        attachDefaultTableHandlers();

        // Add command to menu.
        CommandManager.register(Strings.PANEL_COMMAND, Constants.CMD_GIT_TOGGLE_PANEL, toggle);
        CommandManager.register(Strings.COMMIT_CURRENT_SHORTCUT, Constants.CMD_GIT_COMMIT_CURRENT, commitCurrentFile);
        CommandManager.register(Strings.COMMIT_ALL_SHORTCUT, Constants.CMD_GIT_COMMIT_ALL, commitAllFiles);
        CommandManager.register(Strings.PUSH_SHORTCUT, Constants.CMD_GIT_PUSH, EventEmitter.getEmitter(Events.HANDLE_PUSH));
        CommandManager.register(Strings.PULL_SHORTCUT, Constants.CMD_GIT_PULL, EventEmitter.getEmitter(Events.HANDLE_PULL));
        CommandManager.register(Strings.FETCH_SHORTCUT, Constants.CMD_GIT_FETCH, EventEmitter.getEmitter(Events.HANDLE_FETCH));
        CommandManager.register(Strings.GOTO_PREVIOUS_GIT_CHANGE, Constants.CMD_GIT_GOTO_PREVIOUS_CHANGE, GutterManager.goToPrev);
        CommandManager.register(Strings.GOTO_NEXT_GIT_CHANGE, Constants.CMD_GIT_GOTO_NEXT_CHANGE, GutterManager.goToNext);
        CommandManager.register(Strings.REFRESH_GIT, Constants.CMD_GIT_REFRESH, EventEmitter.getEmitter(Events.REFRESH_ALL));
        CommandManager.register(Strings.RESET_LOCAL_REPO, Constants.CMD_GIT_DISCARD_ALL_CHANGES, discardAllChanges);
        CommandManager.register(Strings.UNDO_LAST_LOCAL_COMMIT, Constants.CMD_GIT_UNDO_LAST_COMMIT, undoLastLocalCommit);
        CommandManager.register(Strings.UNDO_LAST_LOCAL_COMMIT, Constants.CMD_GIT_UNDO_LAST_COMMIT, undoLastLocalCommit);
        CommandManager.register(Strings.CHANGE_USER_NAME, Constants.CMD_GIT_CHANGE_USERNAME, EventEmitter.getEmitter(Events.GIT_CHANGE_USERNAME));
        CommandManager.register(Strings.CHANGE_USER_EMAIL, Constants.CMD_GIT_CHANGE_EMAIL, EventEmitter.getEmitter(Events.GIT_CHANGE_EMAIL));
        CommandManager.register(Strings.ENABLE_GERRIT_PUSH_REF, Constants.CMD_GIT_GERRIT_PUSH_REF, EventEmitter.getEmitter(Events.GERRIT_TOGGLE_PUSH_REF));
        CommandManager.register(Strings.VIEW_AUTHORS_SELECTION, Constants.CMD_GIT_AUTHORS_OF_SELECTION, handleAuthorsSelection);
        CommandManager.register(Strings.VIEW_AUTHORS_FILE, Constants.CMD_GIT_AUTHORS_OF_FILE, handleAuthorsFile);
        CommandManager.register(Strings.HIDE_UNTRACKED, Constants.CMD_GIT_TOGGLE_UNTRACKED, handleToggleUntracked);

        // Show gitPanel when appropriate
        if (Preferences.get("panelEnabled")) {
            toggle(true);
        }
        _panelResized();
    } // function init() {

    function enable() {
        EventEmitter.emit(Events.GIT_ENABLED);
        // this function is called after every Branch.refresh
        gitPanelMode = null;
        //
        $gitPanel.find(".git-available").show();
        $gitPanel.find(".git-not-available").hide();
        //
        Main.$icon.removeClass("warning").removeAttr("title");
        gitPanelDisabled = false;
        // after all is enabled
        refresh();
    }

    function disable(cause) {
        EventEmitter.emit(Events.GIT_DISABLED, cause);
        gitPanelMode = cause;
        // causes: not-repo
        if (gitPanelMode === "not-repo") {
            $gitPanel.find(".git-available").hide();
            $gitPanel.find(".git-not-available").show();
        } else {
            Main.$icon.addClass("warning").attr("title", cause);
            toggle(false);
            gitPanelDisabled = true;
        }
        refresh();
    }

    // Event listeners
    EventEmitter.on(Events.GIT_USERNAME_CHANGED, function (userName) {
        if(userName){
            _setName(Constants.CMD_GIT_CHANGE_USERNAME,
                StringUtils.format(Strings.CHANGE_USER_NAME_MENU, userName));
        } else {
            _setName(Constants.CMD_GIT_CHANGE_USERNAME, Strings.CHANGE_USER_NAME);
        }
    });

    EventEmitter.on(Events.GIT_EMAIL_CHANGED, function (email) {
        $gitPanel.find(".git-user-email").text(email);
        if(email){
            _setName(Constants.CMD_GIT_CHANGE_EMAIL,
                StringUtils.format(Strings.CHANGE_USER_EMAIL_MENU, email));
        } else {
            _setName(Constants.CMD_GIT_CHANGE_EMAIL, Strings.CHANGE_USER_EMAIL);
        }
    });

    EventEmitter.on(Events.GIT_REMOTE_AVAILABLE, function () {
        $gitPanel.find(".git-pull, .git-push, .git-fetch").prop("disabled", false);
    });

    EventEmitter.on(Events.GIT_REMOTE_NOT_AVAILABLE, function () {
        $gitPanel.find(".git-pull, .git-push, .git-fetch").prop("disabled", true);
    });

    EventEmitter.on(Events.GIT_ENABLED, function () {
        // Add info from Git to panel
        Git.getConfig("user.name").then(function (currentUserName) {
            EventEmitter.emit(Events.GIT_USERNAME_CHANGED, currentUserName);
        });
        Git.getConfig("user.email").then(function (currentEmail) {
            EventEmitter.emit(Events.GIT_EMAIL_CHANGED, currentEmail);
        });
        Git.getConfig("gerrit.pushref").then(function (strEnabled) {
            var enabled = strEnabled === "true";
            // Handle the case where we switched to a repo that is using gerrit
            if (enabled && !Preferences.get("gerritPushref")) {
                Preferences.set("gerritPushref", true);
            }
            EventEmitter.emit(Events.GERRIT_PUSH_REF_TOGGLED, enabled);
        });
    });

    EventEmitter.on(Events.BRACKETS_CURRENT_DOCUMENT_CHANGE, function () {
        if (!gitPanel) { return; }
        refreshCurrentFile();
    });

    EventEmitter.on(Events.BRACKETS_DOCUMENT_SAVED, function () {
        if (!gitPanel) { return; }
        refresh();
    });

    EventEmitter.on(Events.BRACKETS_FILE_CHANGED, function (fileSystemEntry) {
        // files are added or deleted from the directory
        if (fileSystemEntry.isDirectory) {
            refresh();
        }
    });

    EventEmitter.on(Events.REBASE_MERGE_MODE, function (rebaseEnabled, mergeEnabled) {
        $gitPanel.find(".git-rebase").toggle(rebaseEnabled);
        $gitPanel.find(".git-merge").toggle(mergeEnabled);
        $gitPanel.find("button.git-commit").toggle(!rebaseEnabled && !mergeEnabled);
    });

    EventEmitter.on(Events.FETCH_STARTED, function () {
        $gitPanel.find(".git-fetch")
            .addClass("btn-loading")
            .prop("disabled", true);
    });

    EventEmitter.on(Events.FETCH_COMPLETE, function () {
        $gitPanel.find(".git-fetch")
            .removeClass("btn-loading")
            .prop("disabled", false);
        refreshCommitCounts();
    });

    EventEmitter.on(Events.REFRESH_COUNTERS, function () {
        refreshCommitCounts();
    });

    EventEmitter.on(Events.HANDLE_GIT_COMMIT, function () {
        handleGitCommit(lastCommitMessage[ProjectManager.getProjectRoot().fullPath], false, COMMIT_MODE.DEFAULT);
    });

    exports.init = init;
    exports.refresh = refresh;
    exports.toggle = toggle;
    exports.enable = enable;
    exports.disable = disable;
    exports.getSelectedHistoryCommit = getSelectedHistoryCommit;
    exports.getPanel = function () { return $gitPanel; };

});

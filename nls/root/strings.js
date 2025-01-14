/*jshint maxlen:false */

define({
    ACTION:                             "Action",
    STATUSBAR_SHOW_GIT:                 "Git Panel",
    ADD_ENDLINE_TO_THE_END_OF_FILE:     "Add endline at the end of file",
    ADD_TO_GITIGNORE:                   "Add to .gitignore",
    AMEND_COMMIT:                       "Amend last commit",
    SKIP_COMMIT_CHECKS:                 "Skip pre-commit checks (--no-verify)",
    AMEND_COMMIT_FORBIDDEN:             "Cannot amend commit when there are no unpushed commits",
    _ANOTHER_BRANCH:                    "another branch",
    AUTHOR:                             "Author",
    AUTHORS_OF:                         "Authors of",
    SYSTEM_CONFIGURATION:               "System configuration",
    BRACKETS_GIT_ERROR:                 "Git encountered an error\u2026",
    BRANCH_NAME:                        "Branch name",
    BUTTON_CANCEL:                      "Cancel",
    CHECKOUT_COMMIT:                    "Checkout",
    CHECKOUT_COMMIT_DETAIL:             "<b>Commit Message:</b> {0} <br><b>Commit hash:</b> {1}",
    GIT_CLONE:                          "Clone",
    BUTTON_CLOSE:                       "Close",
    BUTTON_COMMIT:                      "Commit",
    BUTTON_DEFAULTS:                    "Restore defaults",
    BUTTON_FIND_CONFLICTS:              "Find conflicts\u2026",
    GIT_INIT:                           "Init",
    BUTTON_MERGE_ABORT:                 "Abort merge",
    BUTTON_OK:                          "OK",
    BUTTON_REBASE_ABORT:                "Abort",
    BUTTON_REBASE_CONTINUE:             "Continue rebase",
    BUTTON_REBASE_SKIP:                 "Skip",
    MENU_RESET_HARD:                    "Discard changes and commits after this (hard reset)",
    MENU_RESET_MIXED:                   "Discard commits after this but keep changes unstaged (mixed reset)",
    MENU_RESET_SOFT:                    "Discard commits after this but keep changes staged (soft reset)",
    MENU_TAG_COMMIT:                    "Tag Commit",
    RESET_HARD_TITLE:                   "Confirm Hard Reset",
    RESET_MIXED_TITLE:                  "Confirm Mixed Reset",
    RESET_SOFT_TITLE:                   "Confirm Soft Reset",
    RESET_DETAIL:                       "<b>Commits after the following will be discarded:</b><br><b>Commit Message:</b> {0}<br><b>Git Command:</b> {1}",
    RESET_HARD_MESSAGE:                 "This action will discard all changes and commits after the selected commit. <b>This operation cannot be undone easily.</b> Are you sure you want to proceed?<br><br>⚠️ Warning: This rewrites history and should not be used on commits that have been pushed to a shared branch.",
    RESET_MIXED_MESSAGE:                "This action will discard all commits after the selected commit but keep all changes unstaged. <b>This operation cannot be undone easily.</b> Are you sure you want to proceed?<br><br>⚠️ Warning: This rewrites history and should not be used on commits that have been pushed to a shared branch.",
    RESET_SOFT_MESSAGE:                 "This action will discard all commits after the selected commit but keep all changes staged for a new commit. <b>This operation cannot be undone easily.</b> Are you sure you want to proceed?<br><br>⚠️ Warning: This rewrites history and should not be used on commits that have been pushed to a shared branch.",
    BUTTON_SAVE:                        "Save",
    RESET:                              "Reset",
    CANCEL:                             "Cancel",
    CHANGE_USER_EMAIL_TITLE:            "Change git email",
    CHANGE_USER_EMAIL:                  "Change git email\u2026",
    CHANGE_USER_EMAIL_MENU:             "Change git email ({0})\u2026",
    CHANGE_USER_NAME_TITLE:             "Change git username",
    CHANGE_USER_NAME:                   "Change git username\u2026",
    CHANGE_USER_NAME_MENU:              "Change git username ({0})\u2026",
    REQUIRES_APP_RESTART_SETTING:       "Changing this setting requires an app restart to take effect",
    CLEAN_FILE_END:                     "File cleaned",
    CLEAN_FILE_START:                   "Cleaning file",
    CLEANING_WHITESPACE_PROGRESS:       "Cleaning whitespace from files\u2026",
    CLEAR_WHITESPACE_ON_FILE_SAVE:      "Clear whitespace on file save",
    CLONE_REPOSITORY:                   "Clone repository",
    CODE_INSPECTION_PROBLEMS:           "Code inspection problems",
    CODE_INSPECTION_IN_PROGRESS:        "Code inspection in progress\u2026",
    CODE_INSPECTION_PROBLEMS_NONE:      "No problems detected",
    CODE_INSPECTION_DONE_FILES:         "{0} of {1} files done\u2026",
    COLLAPSE_ALL:                       "Collapse all",
    PLEASE_WAIT:                        "Please wait\u2026",
    COMMIT:                             "Commit",
    COMMIT_ALL_SHORTCUT:                "Commit all files\u2026",
    COMMIT_CURRENT_SHORTCUT:            "Commit current file\u2026",
    COMMIT_MESSAGE_PLACEHOLDER:         "Enter commit message here\u2026",
    CREATE_NEW_BRANCH:                  "Create new branch\u2026",
    CREATE_NEW_BRANCH_TITLE:            "Create new branch",
    CREATE_NEW_GITFTP_SCOPE:            "Create new Git-FTP remote\u2026",
    CREATE_NEW_REMOTE:                  "Create new remote\u2026",
    CURRENT_TRACKING_BRANCH:            "Current tracking branch",
    _CURRENT_TRACKING_BRANCH:           "current tracking branch",
    DEFAULT_GIT_TIMEOUT:                "Default Git operation timeout (in seconds)",
    DELETE_FILE_BTN:                    "Delete file\u2026",
    DELETE_LOCAL_BRANCH:                "Delete local branch",
    DELETE_LOCAL_BRANCH_NAME:           "Do you really wish to delete local branch \"{0}\"?",
    DELETE_REMOTE:                      "Delete remote",
    DELETE_REMOTE_NAME:                 "Do you really wish to delete remote \"{0}\"?",
    DELETE_SCOPE:                       "Delete Git-FTP scope",
    DELETE_SCOPE_NAME:                  "Do you really wish to delete Git-FTP scope \"{0}\"?",
    DIALOG_CHECKOUT:                    "When checking out a commit, the repo will go into a DETACHED HEAD state. You can't make any commits unless you create a branch based on this.",
    DIALOG_PULL_TITLE:                  "Pull from remote",
    DIALOG_PUSH_TITLE:                  "Push to remote",
    SKIP_PRE_PUSH_CHECKS:               "Skip pre-push checks (--no-verify)",
    DIFF:                               "Diff",
    DIFFTOOL:                           "Diff with difftool",
    DIFF_FAILED_SEE_FILES:              "Git diff failed to provide diff results. This is the list of staged files to be commited:",
    DIFF_TOO_LONG:                      "Diff too long to display",
    ENABLE_GERRIT_PUSH_REF:             "Use Gerrit-compatible push ref",
    ENTER_NEW_USER_EMAIL:               "Enter email",
    ENTER_NEW_USER_NAME:                "Enter username",
    ENTER_PASSWORD:                     "Enter password:",
    ENTER_REMOTE_GIT_URL:               "Enter Git URL of the repository you want to clone:",
    ENTER_REMOTE_NAME:                  "Enter name of the new remote:",
    ENTER_REMOTE_URL:                   "Enter URL of the new remote:",
    ENTER_USERNAME:                     "Enter username:",
    ERROR_NOTHING_SELECTED:             "Nothing is selected!",
    ERROR_SAVE_FIRST:                   "Save the document first!",
    ERROR_TERMINAL_NOT_FOUND:           "Terminal was not found for your OS, you can define a custom Terminal command in the settings",
    EXPAND_ALL:                         "Expand all",
    EXTENDED_COMMIT_MESSAGE:            "EXTENDED",
    GETTING_STAGED_DIFF_PROGRESS:       "Getting diff of staged files\u2026",
    GIT_COMMIT:                         "Git commit\u2026",
    GIT_COMMIT_IN_PROGRESS:             "Git Commit in Progress",
    GIT_DIFF:                           "Git diff &mdash;",
    GIT_PULL_RESPONSE:                  "Git Pull response",
    GIT_PUSH_RESPONSE:                  "Git Push response",
    GIT_REMOTES:                        "Git remotes",
    GIT_SETTINGS:                       "Git Settings\u2026",
    GOTO_NEXT_GIT_CHANGE:               "Go to next Git change",
    GOTO_PREVIOUS_GIT_CHANGE:           "Go to previous Git change",
    GUTTER_CLICK_DETAILS:               "Click for more details",
    HIDE_UNTRACKED:                     "Hide untracked files in panel",
    HISTORY:                            "History",
    HISTORY_COMMIT_BY:                  "by",
    LINES:                              "Lines",
    _LINES:                             "lines",
    MARK_MODIFIED_FILES_IN_TREE:        "Mark modified files in file tree",
    MERGE_BRANCH:                       "Merge branch",
    MERGE_MESSAGE:                      "Merge message",
    MERGE_RESULT:                       "Merge result",
    NORMALIZE_LINE_ENDINGS:             "Normalize line endings (to \\n)",
    NOTHING_TO_COMMIT:                  "Nothing to commit, working directory clean.",
    OK:                                 "OK",
    OPERATION_IN_PROGRESS_TITLE:        "Git operation in progress\u2026",
    ORIGIN_BRANCH:                      "Origin branch",
    ON_BRANCH:                          "'{0}' - Current Git branch",
    PANEL_COMMAND:                      "Show Git panel",
    PASSWORD:                           "Password",
    PASSWORDS:                          "Passwords",
    PATH_TO_GIT_EXECUTABLE:             "Path to Git executable",
    PULL_AVOID_MERGING:                 "Avoid manual merging",
    PULL_DEFAULT:                       "Default merge",
    PULL_FROM:                          "Pull from",
    PULL_MERGE_NOCOMMIT:                "Merge without commit",
    PULL_REBASE:                        "Use rebase",
    PULL_RESET:                         "Use soft reset",
    PULL_SHORTCUT:                      "Pull from remote\u2026",
    PULL_SHORTCUT_BEHIND:               "Pull from remote ({0} behind)\u2026",
    PULL_BEHAVIOR:                      "Pull Behavior",
    FETCH_SHORTCUT:                     "Fetch from remote",
    PUSH_DEFAULT:                       "Default push",
    PUSH_DELETE_BRANCH:                 "Delete remote branch",
    PUSH_SEND_TAGS:                     "Send tags",
    PUSH_FORCED:                        "Forced push",
    PUSH_SHORTCUT:                      "Push to remote\u2026",
    PUSH_SHORTCUT_AHEAD:                "Push to remote ({0} ahead)\u2026",
    PUSH_TO:                            "Push to",
    PUSH_BEHAVIOR:                      "Push Behavior",
    Q_UNDO_CHANGES:                     "Reset changes to file <span class='dialog-filename'>{0}</span>?",
    REBASE_RESULT:                      "Rebase result",
    REFRESH_GIT:                        "Refresh Git",
    REMOVE_BOM:                         "Remove BOM from files",
    REMOVE_FROM_GITIGNORE:              "Remove from .gitignore",
    RESET_LOCAL_REPO:                   "Discard all changes since last commit\u2026",
    DISCARD_CHANGES:                    "Discard Changes",
    RESET_LOCAL_REPO_CONFIRM:           "Do you wish to discard all changes done since last commit? This action can't be reverted.",
    UNDO_LOCAL_COMMIT_CONFIRM:          "Are you sure you want to undo the last non-pushed commit?",
    MORE_OPTIONS:                       "More Options",
    CREDENTIALS:                        "Credentials",
    SAVE_CREDENTIALS_HELP:              "You don't need to fill out username/password if your credentials are managed elsewhere. Use this only when your operation keeps timing out.",
    SAVE_CREDENTIALS_IN_URL:            "Save credentials to remote url (in plain text)",
    SET_THIS_BRANCH_AS_TRACKING:        "Set this branch as a new tracking branch",
    STRIP_WHITESPACE_FROM_COMMITS:      "Strip trailing whitespace from commits",
    TARGET_BRANCH:                      "Target branch",
    TITLE_CHECKOUT:                     "Checkout Commit?",
    TOOLTIP_CLONE:                      "Clone existing repository",
    TOOLTIP_COMMIT:                     "Commit the selected files",
    TOOLTIP_FETCH:                      "Fetch all remotes and refresh counters",
    TOOLTIP_FIND_CONFLICTS:             "Starts a search for Git merge/rebase conflicts in the project",
    TOOLTIP_HIDE_FILE_HISTORY:          "Hide file history",
    TOOLTIP_HIDE_HISTORY:               "Hide history",
    TOOLTIP_INIT:                       "Initialize repository",
    TOOLTIP_MERGE_ABORT:                "Abort the merge operation and reset HEAD to the last local commit",
    TOOLTIP_PICK_REMOTE:                "Pick preferred remote",
    TOOLTIP_PULL:                       "Git Pull",
    TOOLTIP_PUSH:                       "Git Push",
    TOOLTIP_REBASE_ABORT:               "Abort the rebase operation and reset HEAD to the original branch",
    TOOLTIP_REBASE_CONTINUE:            "Restart the rebasing process after having resolved a merge conflict",
    TOOLTIP_REBASE_SKIP:                "Restart the rebasing process by skipping the current patch",
    TOOLTIP_REFRESH_PANEL:              "Refresh panel",
    TOOLTIP_SHOW_FILE_HISTORY:          "Show file history",
    TOOLTIP_SHOW_HISTORY:               "Show history",
    UNDO_CHANGES:                       "Discard changes",
    UNDO_CHANGES_BTN:                   "Discard changes\u2026",
    UNDO_LAST_LOCAL_COMMIT:             "Undo last local (not pushed) commit\u2026",
    UNDO_COMMIT:                        "Undo Commit",
    URL:                                "URL",
    USERNAME:                           "Username",
    USER_ABORTED:                       "User aborted!",
    USE_GIT_GUTTER:                     "Use Git gutter marks",
    USE_NOFF:                           "Create a merge commit even when the merge resolves as a fast-forward (--no-ff)",
    USE_REBASE:                         "Use REBASE",
    USE_VERBOSE_DIFF:                   "Show verbose output in diffs",
    USE_DIFFTOOL:                       "Use difftool for diffs",
    VIEW_AUTHORS_FILE:                  "View authors of file\u2026",
    VIEW_AUTHORS_SELECTION:             "View authors of selection\u2026",
    VIEW_THIS_FILE:                     "View this file",
    TAG_NAME_PLACEHOLDER:               "Enter tag name here\u2026",
    TAG_NAME:                           "Tag",
    CMD_CLOSE_UNMODIFIED:               "Close Unmodified Files",
    FILE_ADDED:                         "New file",
    FILE_COPIED:                        "Copied",
    FILE_DELETED:                       "Deleted",
    FILE_IGNORED:                       "Ignored",
    FILE_MODIFIED:                      "Modified",
    FILE_RENAMED:                       "Renamed",
    FILE_STAGED:                        "Staged",
    FILE_UNMERGED:                      "Unmerged",
    FILE_UNMODIFIED:                    "Unmodified",
    FILE_UNTRACKED:                     "Untracked",
    GIT_PUSH_SUCCESS_MSG:               "Successfully pushed fast-forward",
    GIT_PUSH_FORCE_UPDATED_MSG:         "Successful forced update",
    GIT_PUSH_DELETED_MSG:               "Successfully deleted ref",
    GIT_PUSH_NEW_REF_MSG:               "Successfully pushed new ref",
    GIT_PUSH_REJECTED_MSG:              "Ref was rejected or failed to push",
    GIT_PUSH_UP_TO_DATE_MSG:            "Ref was up to date and did not need pushing",
    GIT_PULL_SUCCESS:                   "Successfully completed git pull",
    GIT_MERGE_SUCCESS:                  "Successfully completed git merge",
    GIT_REBASE_SUCCESS:                 "Successfully completed git rebase",
    GIT_BRANCH_DELETE_SUCCESS:          "Successfully deleted git branch",
    INIT_NEW_REPO_FAILED:               "Failed to initialize new repository",
    GIT_CLONE_REMOTE_FAILED:            "Cloning remote repository failed!",
    GIT_CLONE_ERROR_EXPLAIN:            "The selected directory `{0}`\n is not empty. Git clone requires a clean, empty directory.\nIf it appears empty, check for hidden files.",
    FOLDER_NOT_WRITABLE:                "The selected directory `{0}`\n is not writable.",
    GIT_NOT_FOUND_MESSAGE:              "Git is not installed or cannot be found on your system. Please install Git or provide the correct path to the Git executable in the text field below.",
    ERROR_GETTING_BRANCH_LIST:          "Getting branch list failed",
    ERROR_READING_GIT_HEAD:             "Reading .git/HEAD file failed",
    ERROR_PARSING_BRANCH_NAME:          "Failed parsing branch name from {0}",
    ERROR_READING_GIT_STATE:            "Reading .git state failed",
    ERROR_GETTING_DELETED_FILES:        "Getting list of deleted files failed",
    ERROR_SWITCHING_BRANCHES:           "Switching branches failed",
    ERROR_GETTING_CURRENT_BRANCH:       "Getting current branch name failed",
    ERROR_REBASE_FAILED:               "Rebase failed",
    ERROR_MERGE_FAILED:                "Merge failed",
    ERROR_BRANCH_DELETE_FORCED:         "Forced branch deletion failed",
    ERROR_FETCH_REMOTE_INFO:           "Fetching remote information failed",
    ERROR_CREATE_BRANCH:               "Creating new branch failed",
    ERROR_REFRESH_GUTTER:               "Refreshing gutter failed!",
    ERROR_GET_HISTORY:                  "Failed to get history",
    ERROR_GET_MORE_HISTORY:             "Failed to load more history rows",
    ERROR_GET_CURRENT_BRANCH:           "Failed to get current branch name",
    ERROR_GET_DIFF_FILE_COMMIT:         "Failed to get diff",
    ERROR_GET_DIFF_FILES:               "Failed to load list of diff files",
    ERROR_MODIFY_GITIGNORE:             "Failed modifying .gitignore",
    ERROR_UNDO_LAST_COMMIT_FAILED:      "Impossible to undo last commit",
    ERROR_MODIFY_FILE_STATUS_FAILED:     "Failed to modify file status",
    ERROR_CHANGE_USERNAME_FAILED:        "Impossible to change user name",
    ERROR_CHANGE_EMAIL_FAILED:           "Impossible to change user email",
    ERROR_TOGGLE_GERRIT_PUSH_REF_FAILED: "Impossible to toggle gerrit push ref",
    ERROR_RESET_LOCAL_REPO_FAILED:       "Reset of local repository failed",
    ERROR_CREATE_TAG:                    "Create tag failed",
    ERROR_CODE_INSPECTION_FAILED:        "CodeInspection.inspectFile failed to execute for file",
    ERROR_CANT_GET_STAGED_DIFF:          "Cant get diff for staged files",
    ERROR_GIT_COMMIT_FAILED:            "Git Commit failed",
    ERROR_GIT_BLAME_FAILED:            "Git Blame failed",
    ERROR_GIT_DIFF_FAILED:            "Git Diff failed",
    ERROR_DISCARD_CHANGES_FAILED:        "Discard changes to a file failed",
    ERROR_COULD_NOT_RESOLVE_FILE:        "Could not resolve file",
    ERROR_MERGE_ABORT_FAILED:            "Merge abort failed",
    ERROR_MODIFIED_DIALOG_FILES:        "The files you were going to commit were modified while commit dialog was displayed. Aborting the commit as the result would be different then what was shown in the dialog.",
    ERROR_GETTING_REMOTES:              "Getting remotes failed!",
    ERROR_REMOTE_CREATION:              "Remote creation failed",
    ERROR_PUSHING_REMOTE:               "Pushing to remote failed",
    ERROR_PULLING_REMOTE:               "Pulling from remote failed",
    ERROR_PULLING_OPERATION:            "Pulling operation failed",
    ERROR_PUSHING_OPERATION:            "Pushing operation failed",
    ERROR_NO_REMOTE_SELECTED:           "No remote has been selected for {0}!",
    ERROR_BRANCH_LIST:                  "Getting branch list failed",
    ERROR_FETCH_REMOTE:                 "Fetching remote information failed"
});

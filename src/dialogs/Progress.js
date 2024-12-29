define(function (require, exports) {
    "use strict";

    // Brackets modules
    const Dialogs = brackets.getModule("widgets/Dialogs"),
        Mustache = brackets.getModule("thirdparty/mustache/mustache");

    // Local modules
    const Strings = require("strings"),
        Events        = require("src/Events");

    // Templates
    var template = require("text!src/dialogs/templates/progress-dialog.html");

    // Module variables
    var lines,
        $textarea;

    // Implementation
    function addLine(str) {
        lines.push(str);
    }

    function onProgress(str) {
        if (typeof str === "string") {
            addLine(str);
        }
        if ($textarea) {
            $textarea.val(lines.join("\n"));
            $textarea.scrollTop($textarea[0].scrollHeight - $textarea.height());
        }
    }

    function show(promise, progressTracker, showOpts = {}) {
        if (!promise || !promise.finally) {
            throw new Error("Invalid promise argument for progress dialog!");
        }
        if(!progressTracker) {
            throw new Error("Invalid progressTracker argument for progress dialog!");
        }

        const title = showOpts.title;
        const options = showOpts.options || {};

        return new ProgressPromise(function (resolve, reject) {

            lines = [];
            $textarea = null;

            var dialog,
                finished = false;

            function showDialog() {
                if (finished) {
                    return;
                }

                var templateArgs = {
                    title: title || Strings.OPERATION_IN_PROGRESS_TITLE,
                    Strings: Strings
                };

                var compiledTemplate = Mustache.render(template, templateArgs);
                dialog = Dialogs.showModalDialogUsingTemplate(compiledTemplate);

                $textarea = dialog.getElement().find("textarea");
                onProgress();
            }

            function finish() {
                finished = true;
                if (dialog) {
                    dialog.close();
                }
                promise.then(function (val) {
                    resolve(val);
                }).catch(function (err) {
                    reject(err);
                });
            }

            if (!options.preDelay) {
                showDialog();
            } else {
                setTimeout(function () {
                    showDialog();
                }, options.preDelay * 1000);
            }

            progressTracker.off(`${Events.GIT_PROGRESS_EVENT}.progressDlg`);
            progressTracker.on(`${Events.GIT_PROGRESS_EVENT}.progressDlg`, (_evt, data)=>{
                onProgress(data);
            });
            promise.finally(function () {
                progressTracker.off(`${Events.GIT_PROGRESS_EVENT}.progressDlg`);
                onProgress("Finished!");
                if (!options.postDelay || !dialog) {
                    finish();
                } else {
                    setTimeout(function () {
                        finish();
                    }, options.postDelay * 1000);
                }
            });

        });
    }

    function waitForClose() {
        return new ProgressPromise(function (resolve) {
            function check() {
                var visible = $("#git-progress-dialog").is(":visible");
                if (!visible) {
                    resolve();
                } else {
                    setTimeout(check, 20);
                }
            }
            setTimeout(check, 20);
        });
    }

    function newProgressTracker() {
        const tracker = {};
        EventDispatcher.makeEventDispatcher(tracker);
        return tracker;
    }

    exports.show = show;
    exports.newProgressTracker = newProgressTracker;
    exports.waitForClose = waitForClose;

});

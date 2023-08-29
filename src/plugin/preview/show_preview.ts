import { CommonUtil } from "../../util/commonUtil";
import * as vscode from "vscode";


export const showPreviewComand = (args: any) => {
    // 1. fetch widget code from current file and put it as the child of the current framework
    // 2. generate preview HTML
    // 3. Display preview use VS code webview API
    // 4. always update webview after hotReload 
    return CommonUtil.withProgress(
        async () => {
            try {
                const panel = vscode.window.createWebviewPanel(
                    "flutter-preview", // Identifies the type of the webview. Used internally
                    "flutter-preview", // Title of the panel displayed to the user
                    vscode.ViewColumn.Beside, // Editor column to show the new webview panel in.
                    {
                      // allow scripts
                      enableScripts: true,
                      // retain context when hidden
                      retainContextWhenHidden: true,
                    }
                  );
            } catch (err) {

            }
        },
        `rendering...`
    );
};
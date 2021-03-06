import * as vscode from 'vscode';
import { ErrorHandler } from '../../util/errorHandler';
import { CommonUtil } from '../../util/commonUtil';
import { getActiveTextEditor } from '../../util/get-active';
import { validEditor } from '../../util/editorvalidator';


export const enableNullSafety = (args: any) => {
    return CommonUtil.withProgress(
        async () => {
            try {
                const activeEditor = getActiveTextEditor();
                if (!validEditor(activeEditor)) {
                    return ;
                }

                var pos = new vscode.Position(0, 0);
                var wseditor = new vscode.WorkspaceEdit();
                wseditor.insert(activeEditor.document.uri, pos, "// @dart = 2.12 \n// ignore_for_file: import_of_legacy_library_into_null_safe\n");
                vscode.workspace.applyEdit(wseditor);    
                
     
                vscode.window.showInformationMessage(`successfully`);

            } catch (err) {
                ErrorHandler.handleError(err);
            }
        },
        `Generating...`
    );
};
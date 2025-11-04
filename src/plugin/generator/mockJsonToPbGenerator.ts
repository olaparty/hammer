import * as path from 'path';
import * as vscode from 'vscode';
import { ErrorHandler } from '../../util/errorHandler';
import { CommonUtil } from '../../util/commonUtil';
import { PathUtil } from '../../util/pathUtil';
import { runProcess, safeSpawn } from '../../util/process';
import { getActiveTextEditor } from '../../util/get-active';
import { validEditor } from '../../util/editorvalidator';


const mockJsonToPbAction = async (fileName: string, args?: ReadonlyArray<string>, cwd?: string | undefined): Promise<string> => {
    if (!args) {
        args = [];
    }
    
    // Use workspace root as the working directory
    const workspaceRoot = vscode.workspace.rootPath || '';
    if (!cwd) {
        cwd = workspaceRoot;
    }

    // Get relative path from workspace root to the proto file
    const relativePath = path.relative(workspaceRoot, fileName);
    const newArgs = ['mock-convert-pb-single', `file=${relativePath}`];
    const env = {};
    const proc = await runProcess('make', newArgs, cwd, env, safeSpawn);
    if (proc.exitCode === 0) {
        const result = proc.stdout.trim();
        return '';
    }

    return proc.stderr;
}


export const genMockJsonToPbCommand = (args: any) => {
    return CommonUtil.withProgress(
        async () => {
            try {
                const activeEditor = getActiveTextEditor();
                if (!validEditor(activeEditor)) {
                    return ;
                }

                let currentFsPath = activeEditor.document.uri.fsPath;
                if(args && args.fsPath && path.extname(args.fsPath) == '.json') {
                    currentFsPath = args.fsPath
                }

                // Check if filename contains .imp.json and exclude it
                const fileName = path.basename(currentFsPath);
                if (fileName.includes('.imp.json')) {
                    const msg = 'Cannot process .imp.json files. This command is only for imposters .json files.';
                    vscode.window.showWarningMessage(msg);
                    ErrorHandler.handleError(msg);
                    return;
                }

                var result = await mockJsonToPbAction(currentFsPath, [], vscode.workspace.rootPath);
                if(result != ''){
                    vscode.window.showInformationMessage(`failed: ${result}`);
                    return;
                }
     
                vscode.window.showInformationMessage(`generate finished`);

            } catch (err) {
                ErrorHandler.handleError(err);
            }
        },
        `Generating...`
    );
};
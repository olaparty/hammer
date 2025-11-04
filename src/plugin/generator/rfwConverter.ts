import * as path from 'path';
import * as vscode from 'vscode';
import { ErrorHandler } from '../../util/errorHandler';
import { CommonUtil } from '../../util/commonUtil';
import { PathUtil } from '../../util/pathUtil';
import { getActiveTextEditor } from '../../util/get-active';
import { validEditor } from '../../util/editorvalidator';
import { runProcess, safeSpawn } from '../../util/process';
import { GitExtension } from '../../typings/git';

const rfwConvertAction = async (
    rfwCliPath: string,
    fileName: string,
    args?: ReadonlyArray<string>,
    cwd?: string | undefined
): Promise<string> => {
    if (!args) {
        args = [];
    }
    const currentDir = path.dirname(fileName);

    if (!cwd) {
        cwd = currentDir;
    }

    const outputFileName = fileName.replace('.rfwtxt', '.rfw');
    const newArgs = ['-i', fileName, '-o', outputFileName];
    const env = {};

    const proc = await runProcess(rfwCliPath, newArgs, cwd, env, safeSpawn);

    if (proc.exitCode === 0) {
        return '';
    }

    return proc.stderr || proc.stdout;
};

const findRfwCliTool = async (): Promise<string | null> => {
    const extension = vscode.extensions.getExtension<GitExtension>("vscode.git");

    if (!extension || !extension.isActive) {
        return null;
    }

    const git = extension.exports.getAPI(1);
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        return null;
    }

    const repo = git.getRepository(editor.document.uri);
    const rootPath = repo?.rootUri?.path ?? (vscode.workspace.workspaceFolders ?? [])[0]?.uri.path;

    if (!rootPath) {
        return null;
    }

    // Look for rfw_cli in tools directory
    const rfwCliPath = path.join(rootPath, 'tools', 'rfw_cli', 'rfw_cli');

    if (PathUtil.pathExists(rfwCliPath)) {
        return rfwCliPath;
    }

    return null;
};

export const convertRfwCommand = (args: any) => {
    return CommonUtil.withProgress(
        async () => {
            try {
                const activeEditor = getActiveTextEditor();
                if (!validEditor(activeEditor)) {
                    return;
                }

                let currentFsPath = activeEditor.document.uri.fsPath;
                if (args && args.fsPath && path.extname(args.fsPath) === '.rfwtxt') {
                    currentFsPath = args.fsPath;
                }

                // Check if the file is a .rfwtxt file
                if (path.extname(currentFsPath) !== '.rfwtxt') {
                    vscode.window.showInformationMessage('Please select a .rfwtxt file');
                    return;
                }

                const rfwCliPath = await findRfwCliTool();
                if (!rfwCliPath) {
                    vscode.window.showInformationMessage(
                        'Failed: rfw_cli tool not found\nPlease ensure the project has tools/rfw_cli/rfw_cli compiled',
                        { modal: true }
                    );
                    return;
                }

                const result = await rfwConvertAction(rfwCliPath, currentFsPath);
                if (result !== '') {
                    vscode.window.showInformationMessage(`Failed: ${result}`);
                    return;
                }

                const rfwFilePath = currentFsPath.replace('.rfwtxt', '.rfw');
                const rfwFileUri = vscode.Uri.file(rfwFilePath);

                if (!PathUtil.pathExists(rfwFilePath)) {
                    vscode.window.showWarningMessage('RFW file was not generated');
                    return;
                }

                vscode.commands.executeCommand('vscode.open', rfwFileUri).then(_ => {
                    CommonUtil.formatDocument(rfwFileUri);
                });

                vscode.window.showInformationMessage('RFW conversion finished');

            } catch (err) {
                ErrorHandler.handleError(err);
            }
        },
        'Converting to RFW...'
    );
};

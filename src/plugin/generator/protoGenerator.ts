import * as path from 'path';
import * as vscode from 'vscode';
import { ErrorHandler } from '../../util/errorHandler';
import { CommonUtil } from '../../util/commonUtil';
import { execute } from '../../util/execcommand';
import { Constants } from '../../constants';
import { getActiveTextEditor } from '../../util/get-active';
import { validEditor } from '../../util/editorvalidator';


const protocAction = async (fileName: string, args?: ReadonlyArray<string>, cwd?: string | undefined): Promise<string> => {
    if (!args) {
        args = [];
    }
    const currentDir = path.dirname(fileName);
    const protocPluginPath = Constants.EXTENSION_CONTEXT.asAbsolutePath(path.join('bin', 'darttwirp'));

    if(!cwd) {
        cwd = currentDir;
    }
    // -I . --plugin=protoc-gen-custom=./main --custom_out=. captcha.proto
    args = ["-I", currentDir, `--plugin=protoc-gen-custom=${protocPluginPath}`, `--custom_out=${currentDir}`, fileName];
    return await runProtoc(cwd, ...args);
}


const runProtoc = (
    cwd: string,
    ...args: string[]
): Promise<string> => execute('/usr/local/bin/protoc', args, { });


export const genProtoCommand = (args: any) => {
    return CommonUtil.withProgress(
        async () => {
            try {
                const activeEditor = getActiveTextEditor();
                if (!validEditor(activeEditor)) {
                    return "0";
                }
                // TODO: check protoc is installed or not

                const res = await protocAction(activeEditor.document.uri.fsPath);

                vscode.window.showInformationMessage(`generate finished`);
            } catch (err) {
                ErrorHandler.handleError(err);
            }
        },
        `Downloading translations...`
    );
};
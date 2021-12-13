import * as path from 'path';
import * as vscode from 'vscode';
import { ErrorHandler } from '../../util/errorHandler';
import { CommonUtil } from '../../util/commonUtil';
import { execute } from '../../util/execcommand';
import { Constants } from '../../constants';
import { getActiveTextEditor } from '../../util/get-active';
import { validEditor } from '../../util/editorvalidator';


const protocAction = async (binPath: string, fileName: string, args?: ReadonlyArray<string>, cwd?: string | undefined): Promise<string> => {
    if (!args) {
        args = [];
    }
    const currentDir = path.dirname(fileName);
    const protocPluginPath = Constants.EXTENSION_CONTEXT.asAbsolutePath(path.join('bin', 'darttwirp'));

    if (!cwd) {
        cwd = currentDir;
    }
    // -I . --plugin=protoc-gen-custom=./main --custom_out=. captcha.proto
    args = ["-I", currentDir, `--plugin=protoc-gen-custom=${protocPluginPath}`, `--custom_out=${currentDir}`, fileName];
    return await runProtoc(binPath, ...args);
}

const runProtoc = (
    binPath: string,
    ...args: string[]
): Promise<string> => execute(binPath, args, {}, false);

const getProtcBin = (
): Promise<string> => execute('which', ['protoc'], {});

const installProtobuf = (
): Promise<string> => execute('brew', ['install', 'protobuf'], {});

export const genProtoCommand = (args: any) => {
    return CommonUtil.withProgress(
        async () => {
            try {
                const activeEditor = getActiveTextEditor();
                if (!validEditor(activeEditor)) {
                    return "0";
                }
                const protocBin = await getProtcBin();
                if (protocBin == '') {
                    const answer = await vscode.window.showInformationMessage(
                        `Failed: protoc command is missing\nwould you like to install protobuf, otherwise you can install manually by "brew install protobuf"`,
                        { modal: true },
                        ...["Install"]
                    );
                    if (answer == 'Install') {
                        await installProtobuf();
                    }
                    return;
                }

                try {
                    await protocAction(protocBin, activeEditor.document.uri.fsPath)
                } catch (e) {
                    // @ts-ignore
                    vscode.window.showErrorMessage(e.message);
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
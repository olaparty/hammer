import * as path from 'path';
import * as vscode from 'vscode';
import { ErrorHandler } from '../../util/errorHandler';
import { CommonUtil } from '../../util/commonUtil';
import { PathUtil } from '../../util/pathUtil';
import { execute } from '../../util/execcommand';
import { Constants } from '../../constants';
import { getActiveTextEditor } from '../../util/get-active';
import { validEditor } from '../../util/editorvalidator';
import { runProcess, safeSpawn } from '../../util/process';


const protocAction = async (binPath: string, fileName: string, args?: ReadonlyArray<string>, cwd?: string | undefined): Promise<string> => {
    if (!args) {
        args = [];
    }
    const currentDir = path.dirname(fileName);
    const protocPluginPath = Constants.EXTENSION_CONTEXT.asAbsolutePath(path.join('bin', 'proto2dart'));

    if (!cwd) {
        cwd = currentDir;
    }
    const newArgs =  ["-I", currentDir, `--plugin=protoc-gen-custom=${protocPluginPath}`, `--custom_out=${currentDir}`, fileName];
    const env = {};
    const proc = await runProcess(binPath, newArgs, cwd, env, safeSpawn);
	if (proc.exitCode === 0) {
        const result = proc.stdout.trim();
        return ''
	}

    return proc.stderr;

    // -I . --plugin=protoc-gen-custom=./main --custom_out=. captcha.proto
    // args = ["-I", currentDir, `--plugin=protoc-gen-custom=${protocPluginPath}`, `--custom_out=${currentDir}`, fileName];
    // return await runProtoc(binPath, ...args);
}

const runProtoc = (
    binPath: string,
    ...args: string[]
): Promise<string> => execute(binPath ?? "/usr/local/bin/protoc", args, {}, false);

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
                    return ;
                }

                let currentFsPath = activeEditor.document.uri.fsPath;
                if(args && args.fsPath && path.extname(args.fsPath) == '.proto') {
                    currentFsPath = args.fsPath
                }
                
                const protocBin = await getProtcBin();
                if (protocBin === '') {
                    const answer = await vscode.window.showInformationMessage(
                        `Failed: protoc command is missing\nwould you like to install protobuf, otherwise you can install manually by "brew install protobuf"`,
                        { modal: true },
                        ...["Install"]
                    );
                    if (answer === 'Install') {
                        await installProtobuf();
                    }
                    return;
                }

                var result = await protocAction(protocBin, currentFsPath)
                if(result != ''){
                    vscode.window.showInformationMessage(`failed: ${result}`);
                    return;
                }

                const dartfilePath = currentFsPath.replace('.proto','.twirp.dart');
                const dartFileUri = vscode.Uri.file(dartfilePath);

                if(!PathUtil.pathExists(dartfilePath)) return;
               
                vscode.commands.executeCommand('vscode.open', dartFileUri).then(_=>{
                    CommonUtil.formatDocument(dartFileUri);
                });
     
                vscode.window.showInformationMessage(`generate finished`);

            } catch (err) {
                ErrorHandler.handleError(err);
            }
        },
        `Generating...`
    );
};
import * as path from 'path';
import * as vscode from 'vscode';
import { ErrorHandler } from '../../util/errorHandler';
import { CommonUtil } from '../../util/commonUtil';
import { PathUtil } from '../../util/pathUtil';
import { runProcess, safeSpawn } from '../../util/process';
import { getActiveTextEditor } from '../../util/get-active';
import { validEditor } from '../../util/editorvalidator';
import * as fs from 'fs';
import { ExecOptions } from 'child_process';
import { execute } from '../../util/execcommand';


const goRouteAction = async (binPath: string, fileName: string, args?: ReadonlyArray<string>, cwd?: string | undefined): Promise<string> => {
    if (!args) {
        args = [];
    }
    const currentDir = path.dirname(fileName);
    if (!cwd) {
        cwd = currentDir;
    }

    const newArgs = ['pub', 'run', 'go_router_builder_bin', '-s', `${fileName}`];
    const env = {};
    const proc = await runProcess(binPath, newArgs, cwd, env, safeSpawn);
	if (proc.exitCode === 0) {
        const result = proc.stdout.trim();
        return ''
	}

    return proc.stderr;
}

// const runMobx = (
//     binPath: string,
//     args: string[],
//     options: ExecOptions = {},
// ): Promise<string> => execute(binPath ?? "/usr/local/bin/dart", args, options, false);

const getDartBin = (
): Promise<string> => execute('which', ['flutter'], {});


export const genGoRouteCommand = (args: any) => {
    return CommonUtil.withProgress(
        async () => {
            try {
                const activeEditor = getActiveTextEditor();
                if (!validEditor(activeEditor)) {
                    return ;
                }

                let currentFsPath = activeEditor.document.uri.fsPath;
                if(args && args.fsPath && path.extname(args.fsPath) == '.dart') {
                    currentFsPath = args.fsPath
                }
                
                let dartBin = await getDartBin();
                if (dartBin === '') {
                    // message dart bin not found
                    const settingJson = path.join(vscode.workspace.rootPath ?? '', '.vscode', 'settings.json');
                    const settings = JSON.parse(fs.readFileSync(settingJson, 'utf-8') ?? '{}');
                    
                    const flutterSdkPath = settings['dart.flutterSdkPath'] ?? '';
                    if(flutterSdkPath == '') return;
                    dartBin = path.join(flutterSdkPath, 'bin', 'flutter');
                    if(!fs.existsSync(dartBin)) return;
                }
                if (!currentFsPath.includes("banban_base/bbcore/lib/src/routes/routes.dart")) {
                    vscode.window.showInformationMessage(`Please execute this command at banban_base/bbcore/lib/src/routes/routes.dart`);
                    return;
                }
                var result = await goRouteAction(dartBin, currentFsPath, [], vscode.workspace.rootPath);
                if(result != ''){
                    vscode.window.showInformationMessage(`failed: ${result}`);
                    return;
                }
                
                const dartfilePath = currentFsPath.replace('.dart','.g.dart');
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
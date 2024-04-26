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
import { GitExtension } from '../../typings/git';
import {readFileSync} from 'fs'


const protocAction = async (binPath: string, fileName: string, args?: ReadonlyArray<string>, cwd?: string | undefined): Promise<string> => {
    if (!args) {
        args = [];
    }
    const currentDir = path.dirname(fileName);
    const extension = vscode.extensions.getExtension<GitExtension>("vscode.git");
    
    if (!extension) {
      console.warn("Git extension not available");
      return 'Git extension not available';
    }
    if (!extension.isActive) {
      console.warn("Git extension not active");
      return 'Git extension not active';
    }
    const git = extension.exports.getAPI(1);
    const editor = vscode.window.activeTextEditor;
    if(editor) {
        const repo = git.getRepository(editor.document.uri)
        const rootPath = repo?.rootUri?.path ?? (vscode.workspace.workspaceFolders ?? [])[0].uri.path;
        if (rootPath == undefined) {
            return "Unable to find root folder for project in both git or workspace";
        }
        const commonProtoPath = "proto_def/lib/common"
        const commonImportPath = path.join(rootPath, commonProtoPath)
        const outputPath = path.join(rootPath, 'proto_def/lib')
        
        var protocPluginPath = path.join(rootPath, 'tools', 'bin', 'proto2dart');
        if (!cwd) {
            cwd = currentDir;
        }
        const additionalImports =  obtainWellknownImportFiles(fileName)
        
        const newArgs = ["-I", `${currentDir}`, '-I', commonImportPath, `--plugin=protoc-gen-custom=${protocPluginPath}`, `--custom_out=api_path=api,pb_path=pb:${outputPath}`, fileName].concat(additionalImports);
        const env = {};
        const proc = await runProcess(binPath, newArgs, cwd, env, safeSpawn);
        
        if (proc.exitCode === 0) {
            const result = proc.stdout.trim();
            return ''
        }

        return proc.stderr;
        
    } else {
        return "Unable to generate proto files without an proto file opened in the current active editor"
    }
     
    // -I . --plugin=protoc-gen-custom=./main --custom_out=. captcha.proto
    // args = ["-I", currentDir, `--plugin=protoc-gen-custom=${protocPluginPath}`, `--custom_out=${currentDir}`, fileName];
    // return await runProtoc(binPath, ...args);
}

const obtainWellknownImportFiles = (fileName: string): string[] => {
    const protoFile = readFileSync(fileName, {
        encoding: 'utf-8'
    })
    const regex = /"([^"]+)"/;
    const lines = protoFile.split('\n');
    const wellknownImportLines = lines.filter(line => line.startsWith('import "google/protobuf'));
    const wellknownImportFiles = wellknownImportLines.map((val) => {
        const match = val.match(regex);
        if (match && match.length > 1) {
          return match[1];
        }
        return null
    }).flatMap(f => f ? [f] : [])
 

  return wellknownImportFiles;
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
                    return;
                }

                let currentFsPath = activeEditor.document.uri.fsPath;
                if (args && args.fsPath && path.extname(args.fsPath) == '.proto') {
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
                if (result != '') {
                    vscode.window.showInformationMessage(`failed: ${result}`);
                    return;
                }

                const dartfilePath = currentFsPath.replace('.proto', '.twirp.dart');
                const dartFileUri = vscode.Uri.file(dartfilePath);

                if (!PathUtil.pathExists(dartfilePath)) return;

                vscode.commands.executeCommand('vscode.open', dartFileUri).then(_ => {
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
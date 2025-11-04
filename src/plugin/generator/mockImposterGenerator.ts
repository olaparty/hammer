import * as path from 'path';
import * as vscode from 'vscode';
import { ErrorHandler } from '../../util/errorHandler';
import { CommonUtil } from '../../util/commonUtil';
import { PathUtil } from '../../util/pathUtil';
import { runProcess, safeSpawn } from '../../util/process';
import { getActiveTextEditor } from '../../util/get-active';
import { validEditor } from '../../util/editorvalidator';
import * as fs from 'fs';

const validateProtoFile = (filePath: string): { isValid: boolean; message: string } => {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check if file contains both 'service' and 'rpc' keywords
        const hasService = /\bservice\s+\w+/i.test(content);
        const hasRpc = /\brpc\s+\w+/i.test(content);
        
        if (!hasService && !hasRpc) {
            return {
                isValid: false,
                message: 'Proto file must contain both "service" and "rpc" definitions for mock generation.'
            };
        }
        
        if (!hasService) {
            return {
                isValid: false,
                message: 'Proto file must contain a "service" definition for mock generation.'
            };
        }
        
        if (!hasRpc) {
            return {
                isValid: false,
                message: 'Proto file must contain "rpc" methods for mock generation.'
            };
        }
        
        return { isValid: true, message: '' };
    } catch (error) {
        return {
            isValid: false,
            message: `Error reading proto file: ${error}`
        };
    }
};


const mockImposterAction = async (fileName: string, args?: ReadonlyArray<string>, cwd?: string | undefined): Promise<string> => {
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
    const newArgs = ['mock-gen-single', `file=${relativePath}`];
    const env = {};
    const proc = await runProcess('make', newArgs, cwd, env, safeSpawn);
    if (proc.exitCode === 0) {
        const result = proc.stdout.trim();
        return ''
    }

    return proc.stderr;
}


export const genMockImposterCommand = (args: any) => {
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

                // Validate proto file before processing
                const validation = validateProtoFile(currentFsPath);
                if (!validation.isValid) {
                    vscode.window.showWarningMessage(validation.message);
                    ErrorHandler.handleError(validation.message);
                    return;
                }

                var result = await mockImposterAction(currentFsPath, [], vscode.workspace.rootPath);
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
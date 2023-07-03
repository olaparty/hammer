import * as vscode from 'vscode';
import * as path from 'path';
import { PathUtil } from './pathUtil';
import { GitExtension } from '../typings/git';

export type NullAsUndefined<T> = null extends T ? Exclude<T, null> | undefined : T;

export class CommonUtil {

    static getCurrentGitBranch(docUri: vscode.Uri): string | undefined {
        const extension = vscode.extensions.getExtension<GitExtension>("vscode.git");
        
        if (!extension) {
          console.warn("Git extension not available");
          return undefined;
        }
        if (!extension.isActive) {
          console.warn("Git extension not active");
          return undefined;
        }
      
        // "1" == "Get version 1 of the API". Version one seems to be the latest when I
        // type this.
        const git = extension.exports.getAPI(1);
        const repository = git.getRepository(docUri);
        if (!repository) {
          console.warn("No Git repository for current document", docUri);
          return undefined;
        }
      
        const currentBranch = repository.state.HEAD;
        if (!currentBranch) {
          console.warn("No HEAD branch for current document", docUri);
          return undefined;
        }
      
        const branchName = currentBranch.name;
        if (!branchName) {
          console.warn("Current branch has no name", docUri, currentBranch);
          return undefined;
        }
      
        return branchName;
      }
    

    static withProgress<R>(
        task: () => Promise<any>,
        title: string,
        location: vscode.ProgressLocation = vscode.ProgressLocation.Notification
    ): Promise<R> {
        const thenable = vscode.window.withProgress(
            { location, title },
            task
        );
        return new Promise((res, rej) => {
            thenable.then(
                (v) => res(v),
                (e) => rej(e)
            );
        });
    }

    static keyFromRange(range : vscode.Range) : string {
        return `${range.start.line}-${range.start.character}-${range.end.line}-${range.end.character}`;
    }

    static formatDocument(uri: vscode.Uri): Promise<boolean> {
        return new Promise((resolve, reject) => {
            vscode.commands.executeCommand("vscode.executeFormatDocumentProvider", uri,  vscode.window.activeTextEditor?.options)
            .then(
                (edits: vscode.TextEdit | any) => {
                    const newEdit = new vscode.WorkspaceEdit();
                    newEdit.set(uri, edits);
                    vscode.workspace.applyEdit(newEdit);
                    resolve(true);
                },
                (error) => {
                    console.error(error);
                    reject("Could not format document");
                }
            );
        });
    }

    static nullToUndefined<T>(value: T): NullAsUndefined<T> {
        return (value === null ? undefined : value) as NullAsUndefined<T>;
    }

    static getPackagePath(dir: string | undefined): string | undefined {
        if (dir == undefined) {
            var editor = vscode.window.activeTextEditor;
            dir = editor?.document.uri.path;
        }

        if (dir == vscode.workspace.rootPath ?? '') return undefined;

        var parentDir = path.dirname(dir as string);

        var yamlFilePath = path.join(parentDir, 'pubspec.yaml');
        if (PathUtil.pathExists(yamlFilePath)) {
            return parentDir;
        }

        return this.getPackagePath(parentDir);
    }

    static getCurrentPackageName(): string | undefined {
        const packagePath = this.getPackagePath(undefined);
        if (packagePath == undefined) {
            return undefined;
        }
        return path.basename(packagePath);
    }
}
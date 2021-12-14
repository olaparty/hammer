import * as vscode from 'vscode';

export class CommonUtil {

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
}
import * as vscode from 'vscode';


export enum DocumentGitTag {
    Modified = 0,
    New = 1,
    Deleted = 2
}
export interface ICodeAction extends vscode.CodeActionProvider {
    readonly providedCodeActionKinds: vscode.CodeActionKind[];
    createLineDiagnostic(doc: vscode.TextDocument, lineOfText: vscode.TextLine, lineIndex: number, gitTag: DocumentGitTag): vscode.Diagnostic[] |undefined;
    createDiagnostic(doc: vscode.TextDocument, gitTag: DocumentGitTag): vscode.Diagnostic[] |undefined;
}

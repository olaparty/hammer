import * as vscode from 'vscode';

export interface ICodeAction extends vscode.CodeActionProvider {
    readonly providedCodeActionKinds: vscode.CodeActionKind[];
    createDiagnostic(doc: vscode.TextDocument, lineOfText: vscode.TextLine, lineIndex: number): vscode.Diagnostic|undefined;

}

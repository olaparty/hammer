import * as vscode from 'vscode';
import { LocalizedTextAction } from './localizedTextAction';
import { LocalizedWidgetAction } from './localizedWidgetAction';
import { ICodeAction } from './codeaction_interface';


export class Diagnostics {
    private _diagnostics: vscode.DiagnosticCollection;
    private _codeActions: ICodeAction[] = [];
    private _dartExt: any;
    constructor(readonly diagnostics?: vscode.DiagnosticCollection) {
        this._diagnostics = diagnostics ?? vscode.languages.createDiagnosticCollection("hammer");
    }

    public init(context: vscode.ExtensionContext, dartExt: any): void {
        this._dartExt = dartExt;

        this._codeActions.push(new LocalizedTextAction());
        this._codeActions.push(new LocalizedWidgetAction());

        this._subscribeToDocumentChanges(context);

        this._codeActions.forEach((value) => {
            context.subscriptions.push(
                vscode.languages.registerCodeActionsProvider('dart', value, { providedCodeActionKinds: value.providedCodeActionKinds })
            )
        });
    }

    public registerAction(action: ICodeAction): void {
        this._codeActions.push(action);
    }

    private _subscribeToDocumentChanges(context: vscode.ExtensionContext): void {
        if (vscode.window.activeTextEditor) {
            this._refreshDiagnostics(vscode.window.activeTextEditor.document);
        }
        context.subscriptions.push(
            vscode.window.onDidChangeActiveTextEditor(editor => {
                if (editor) {
                    this._refreshDiagnostics(editor.document);
                }
            })
        );

        context.subscriptions.push(
            vscode.workspace.onDidChangeTextDocument(e => this._refreshDiagnostics(e.document))
        );

        context.subscriptions.push(
            vscode.workspace.onDidCloseTextDocument(doc => this._diagnostics.delete(doc.uri))
        );
    }

    private _refreshDiagnostics(doc: vscode.TextDocument): void {
        const diagnostics: vscode.Diagnostic[] = [];
        this._diagnostics.delete(doc.uri);

        // const flutterOutlineTreeProvider = _dartExt.flutterOutlineTreeProvider;
        // const node = flutterOutlineTreeProvider!.getNodeAt(e.textEditor.document.uri, e.selections[0].start);
        this._codeActions.forEach((value) => {
            var diagnostic = value.createDiagnostic(doc);
            if(!!diagnostic) {
                diagnostics.push(...diagnostic);
            }
        });

        for (let lineIndex = 0; lineIndex < doc.lineCount; lineIndex++) {
            const lineOfText = doc.lineAt(lineIndex);
            this._codeActions.forEach((value) => {
                var diagnostic = value.createLineDiagnostic(doc, lineOfText, lineIndex);
                if(!!diagnostic) {
                    diagnostics.push(...diagnostic);
                }
            });
        }

        this._diagnostics.set(doc.uri, diagnostics);
    }
}


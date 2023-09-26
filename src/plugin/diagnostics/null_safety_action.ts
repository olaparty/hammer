import * as vscode from 'vscode';
import { CommonUtil } from '../../util/commonUtil';
import { isActiveFileNewAdded } from '../../util/gitcommand';
import { ICodeAction, DocumentGitTag} from './codeaction_interface';

const SUPPORT_NULL_SAFETY_COMMAND = 'hammer.enable_null_safety';

/** Code that is used to associate diagnostic entries with code actions. */
const TEXT_INSPECT = 'null_safety_inspect';

/**
 * Provides code actions for converting :) to a smiley emoji.
 */
export class NullSafetyAction implements ICodeAction {
    private _textDetectRegex: RegExp = /\/\/\s*@dart\s*=\s*[2|3]\.[0-9]+/g ;

    public readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];

    public provideCodeActions<T>(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction[] | undefined | T {
        const rangeText = document.getText(range);

        let match = this._textDetectRegex.exec(rangeText)
        if(match != null) return;

        const replaceQuickfix = this.createFix(document, range);
        replaceQuickfix.isPreferred = true;

        return [replaceQuickfix];
    }

    private createFix(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction {
        const fix = new vscode.CodeAction(`Convert to be null safety`, vscode.CodeActionKind.QuickFix);
        fix.command = { command: SUPPORT_NULL_SAFETY_COMMAND, arguments: [range], title: 'Convert to be null safety', tooltip: 'Will add //@dart = 2.12 in the head' };
        return fix;
    }

    private createCommand(): vscode.CodeAction {
        const action = new vscode.CodeAction(`Convert to be null safety`, vscode.CodeActionKind.Empty);
        action.command = { command: SUPPORT_NULL_SAFETY_COMMAND, title: 'Convert to be null safety', tooltip: 'You will enter the key for the string' };
        return action;
    }

    createLineDiagnostic(doc: vscode.TextDocument, lineOfText: vscode.TextLine, lineIndex: number, gitTag: DocumentGitTag): vscode.Diagnostic[] | undefined {
        const collections: vscode.Diagnostic[] = [];
        return collections;
    }

    createDiagnostic(doc: vscode.TextDocument, gitTag: DocumentGitTag): vscode.Diagnostic[] | undefined{
        if (doc.fileName.endsWith('a.dart') || doc.fileName.endsWith('k.dart')) return undefined;
        if (gitTag !== DocumentGitTag.New) return undefined;

        const collections: vscode.Diagnostic[] = [];

        try {
            const docText = doc.getText();
                let match = this._textDetectRegex.exec(docText)
                if(match == null) {
                    let startPosition = new vscode.Position(0, 0);
                    collections.push({
                        code: TEXT_INSPECT,
                        message: 'Convert to be null safety',
                        range: new vscode.Range(startPosition, startPosition),
                        severity: vscode.DiagnosticSeverity.Error,
                        source: '[hammer]'
                    });
                }            

        } catch (e) {
            console.log(e);
        }

        return collections;
    }

}

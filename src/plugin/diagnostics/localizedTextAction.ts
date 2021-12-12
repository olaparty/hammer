import * as vscode from 'vscode';
import { CommonUtil } from '../../util/commonUtil';
import { ICodeAction } from './codeaction_interface';

const CREATE_INTL_TEXT_COMMAND = 'localTranslations.create';

/** Code that is used to associate diagnostic entries with code actions. */
const TEXT_INSPECT = 'intl_text_inspect';

/**
 * Provides code actions for converting :) to a smiley emoji.
 */
export class LocalizedTextAction implements ICodeAction {
    private _textDetectRegex: RegExp[] = [
        /Text[\s\n]*\(([\s\n]*)(['"])(.*?)(['"])/g,
        /TextSpan[\s\n]*\(([\s\n]*)(text:\s*)(['"])(.*?)(['"])/g,
    ];

    public readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];

    public provideCodeActions(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction[] | undefined {
        const rangeText = document.getText(range);
        const rawStrTRegx = '([\'\"])(.*?)([\'\"])';
        var matches = rangeText.match(RegExp(rawStrTRegx, 'g'));
        if (!matches || !matches.length) return;

        const replaceQuickfix = this.createFix(document, range);
        replaceQuickfix.isPreferred = true;

        return [replaceQuickfix];
    }

    private createFix(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction {
        const fix = new vscode.CodeAction(`Convert to localized text`, vscode.CodeActionKind.QuickFix);
        fix.command = { command: CREATE_INTL_TEXT_COMMAND, arguments: [range], title: 'convert to localized text', tooltip: 'You will enter the key for the string' };
        return fix;
    }

    private createCommand(): vscode.CodeAction {
        const action = new vscode.CodeAction('convert to localized text', vscode.CodeActionKind.Empty);
        action.command = { command: CREATE_INTL_TEXT_COMMAND, title: 'convert to localized text', tooltip: 'You will enter the key for the string' };
        return action;
    }

    createLineDiagnostic(doc: vscode.TextDocument, lineOfText: vscode.TextLine, lineIndex: number): vscode.Diagnostic[] | undefined {
        const collections: vscode.Diagnostic[] = [];
        return collections;
    }

    createDiagnostic(doc: vscode.TextDocument): vscode.Diagnostic[] | undefined {
        if (doc.fileName.includes('packages/flutter/lib/src')) return undefined;
        const collections: vscode.Diagnostic[] = [];

        try {
            const docText = doc.getText();
            for (const textRegex of this._textDetectRegex) {
                let match;
                while (match = textRegex.exec(docText)) {
                    const matchText = match[0];
                    const rawStrRegex = /(['"])(.*?)(['"])/g;
                    const rawStr = rawStrRegex.exec(matchText);
                    let offset = 0;
                    if (rawStr) {
                        offset = rawStr.index;
                    }

                    const startPos = doc.positionAt(match.index + offset);
                    const endPos = doc.positionAt(match.index + matchText.length);
                    
                    collections.push({
                        code: TEXT_INSPECT,
                        message: 'Should convert to K.dart instead',
                        range: new vscode.Range(startPos, endPos),
                        severity: vscode.DiagnosticSeverity.Warning,
                        source: '[hammer]'
                    });
                }
            }

        } catch (e) {
            console.log(e);
        }

        return collections;
    }

}

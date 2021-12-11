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
    private _textTobeLocalized: string[] = [];
    private _textDetectRegex: string[] = [
        'Text[\\s\\n]*\\(([\\s\\n]*)([\'\"])(.*?)([\'\"])',
        'TextSpan[\\s\\n]*\\(([\\s\\n]*)(text:\\s*)([\'\"])(.*?)([\'\"])',
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
        const rangeMap = new Map<string, boolean>();


        this._textTobeLocalized.forEach((value) => {
            const startIndex = lineOfText.text.indexOf(value);
            if (startIndex == -1) return;

            const range = new vscode.Range(lineIndex, startIndex, lineIndex, startIndex + value.length);
            const rangeKey = CommonUtil.keyFromRange(range);
            const exists = rangeMap.get(rangeKey);
            if(exists) return;
            rangeMap.set(rangeKey, true)
            
            const diagnostic = new vscode.Diagnostic(range, "Should convert to K.dart instead",
                vscode.DiagnosticSeverity.Warning);
            diagnostic.code = TEXT_INSPECT;
            collections.push(diagnostic);
        });

        return collections;
    }

    createDiagnostic(doc: vscode.TextDocument): vscode.Diagnostic[] | undefined {
        if (doc.fileName.includes('packages/flutter/lib/src')) return undefined;

        try {
            this._textTobeLocalized = [];
            // const unicodeTextRegx = '[\u4e00-\u9fa5]';
            const rawStrTRegx = '([\'\"])(.*?)([\'\"])';
            const docText = doc.getText();

            for (const textRegex of this._textDetectRegex) {
                var matchesText = docText.match(RegExp(textRegex, 'g'));
                if (matchesText && matchesText.length > 0) {
                    for (const text of matchesText) {
                        var rawStr = text.match(RegExp(rawStrTRegx, 'g'));
                        if (rawStr && rawStr.length > 0) {
                            // var matches = rawStr[0].match(RegExp(unicodeTextRegx, 'g'));
                            // if (matches && matches.length > 0) {
                            this._textTobeLocalized.push(rawStr[0]);
                            // }
                        }
                    }
                }
            }

        } catch (e) {
            console.log(e);
        }

        return undefined;
    }

}

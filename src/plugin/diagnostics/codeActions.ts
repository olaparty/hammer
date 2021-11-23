import * as vscode from 'vscode';
import { ICodeAction } from './codeaction_interface';

const CREATE_INTL_TEXT_COMMAND = 'localTranslations.create';

/** Code that is used to associate diagnostic entries with code actions. */
const TEXT_INSPECT = 'intl_text_inspect';

/**
 * Provides code actions for converting :) to a smiley emoji.
 */
export class LocalizedText implements ICodeAction {
    private _textTobeLocalized: string[] = [];
    public readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];

    public provideCodeActions(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction[] | undefined {
        const start = range.start;
        const lineOfText = document.lineAt(start.line);
        const rawStrTRegx = '([\'\"])(.*?)([\'\"])';
        var matches = lineOfText.text.match(RegExp(rawStrTRegx, 'g'));
        if (!matches || !matches.length) return;

        const replaceQuickfix = this.createFix(document, range);
        replaceQuickfix.isPreferred = true;

        // const commandAction = this.createCommand();

        return [
            replaceQuickfix,
            // commandAction
        ];
    }

    private createFix(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction {
        const fix = new vscode.CodeAction(`Convert to localized text`, vscode.CodeActionKind.QuickFix);
        // fix.edit = new vscode.WorkspaceEdit();
        fix.command = { command: CREATE_INTL_TEXT_COMMAND, title: 'convert to localized text', tooltip: 'You will enter the key for the string' };

        // const lineOfText = document.getText(range);
        // var matches = lineOfText.match(RegExp('[\'\"](.*?)[\'\"]', 'g'));
        // fix.edit.replace(document.uri, new vscode.Range(range.start, range.start.translate(0, 2)), emoji);
        return fix;
    }

    private createCommand(): vscode.CodeAction {
        const action = new vscode.CodeAction('convert to localized text', vscode.CodeActionKind.Empty);
        action.command = { command: CREATE_INTL_TEXT_COMMAND, title: 'convert to localized text', tooltip: 'You will enter the key for the string' };
        return action;
    }

    createLineDiagnostic(doc: vscode.TextDocument, lineOfText: vscode.TextLine, lineIndex: number): vscode.Diagnostic[] | undefined {
        const collections: vscode.Diagnostic[] = [];
        this._textTobeLocalized.forEach((value) => {
            const startIndex = lineOfText.text.indexOf(value);
            if (startIndex == -1) return;

            const range = new vscode.Range(lineIndex, startIndex, lineIndex, startIndex + value.length);

            const diagnostic = new vscode.Diagnostic(range, "Should convert to K.dart instead",
                vscode.DiagnosticSeverity.Warning);
            diagnostic.code = TEXT_INSPECT;
            collections.push(diagnostic);
        });

        return collections;
    }

    createDiagnostic(doc: vscode.TextDocument): vscode.Diagnostic[] | undefined {
        try {
            this._textTobeLocalized = [];
            const startTextRegx = 'Text[\\s\\n]*\\(([\\s\\n]*)([\'\"])(.*?)([\'\"])';
            const textSpanRegx = 'TextSpan[\\s\\n]*\\(([\\s\\n]*)(text:\\s*)([\'\"])(.*?)([\'\"])';
            // const unicodeTextRegx = '[\u4e00-\u9fa5]';
            const rawStrTRegx = '([\'\"])(.*?)([\'\"])';
            const docText = doc.getText();

            var allmatches: string[] = [];
            var matchesText = docText.match(RegExp(startTextRegx, 'g'));
            if (matchesText && matchesText.length > 0) {
                allmatches = matchesText;
            }

            var matcheTexSpan = docText.match(RegExp(textSpanRegx, 'g'));
            if (matcheTexSpan && matcheTexSpan.length > 0) {
                allmatches.concat(matcheTexSpan);
            }

            allmatches.forEach((value) => {
                var rawStr = value.match(RegExp(rawStrTRegx, 'g'));
                if (rawStr && rawStr.length > 0) {
                    // var matches = rawStr[0].match(RegExp(unicodeTextRegx, 'g'));
                    // if (matches && matches.length > 0) {
                        this._textTobeLocalized.push(rawStr[0]);
                    // }
                }
            });

        } catch (e) {
            console.log(e);
        }

        return undefined;
    }

}

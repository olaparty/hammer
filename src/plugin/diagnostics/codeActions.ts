import * as vscode from 'vscode';
import { ICodeAction } from './codeaction_interface';

const CREATE_INTL_TEXT_COMMAND = 'localTranslations.create';

/** Code that is used to associate diagnostic entries with code actions. */
const TEXT_INSPECT = 'intl_text_inspect';

/**
 * Provides code actions for converting :) to a smiley emoji.
 */
export class LocalizedText implements ICodeAction {

    public readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];

    public provideCodeActions(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction[] | undefined {
        // const start = range.start;
        // const lineOfText = document.lineAt(start.line);
        // var matches = lineOfText.text.match(RegExp('([\'\"](.*?)[\'\"]', 'g'));
        // if(!matches || !matches.length) return;


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

    createDiagnostic(doc: vscode.TextDocument, lineOfText: vscode.TextLine, lineIndex: number): vscode.Diagnostic | undefined {
        try {
            var matches = lineOfText.text.match(RegExp('[\'\"](.*?)[\'\"]', 'g'));
    
            if(!matches || !matches.length){
                return undefined;
            }
            var selectText = matches[0];
            const startIndex = lineOfText.text.indexOf(selectText);
            const range = new vscode.Range(lineIndex, startIndex, lineIndex, startIndex + selectText.length);


            const diagnostic = new vscode.Diagnostic(range, "Should convert to K.dart instead",
                vscode.DiagnosticSeverity.Warning);
            diagnostic.code = TEXT_INSPECT;
            return diagnostic;
        } catch (e) {

        }

        return undefined;
    }
}

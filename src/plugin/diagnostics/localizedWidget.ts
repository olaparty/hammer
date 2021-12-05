import * as vscode from 'vscode';
import { ICodeAction } from './codeaction_interface';

const CREATE_INTL_TEXT_COMMAND = 'int_widget_replace';

/** Code that is used to associate diagnostic entries with code actions. */
const WIDGET_INSPECT = 'intl_widget_inspect';


/**
 * Provides code actions for converting :) to a smiley emoji.
 */
 export class LocalizedWidget implements ICodeAction {
    private _widgetTobeLocalized: string[] = [];

    public readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];

    public provideCodeActions(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction[] | undefined {
        const rangeText = document.getText(range);

        if(rangeText.startsWith('EdgeInsets')){
            const replaceQuickfix = this.createFix(document, range, 'EdgeInsets');
            replaceQuickfix.isPreferred = true;
            return [replaceQuickfix];
        }else if (rangeText.startsWith('Positioned')){
            const replaceQuickfix = this.createFix(document, range, 'Positioned');
            replaceQuickfix.isPreferred = true;
            return [replaceQuickfix];
        }else if (rangeText.startsWith('BorderRadius.only')) {
            const replaceQuickfix = this.createFix(document, range, 'BorderRadius');
            replaceQuickfix.isPreferred = true;
            return [replaceQuickfix];
        }else if (rangeText.startsWith('Alignment')) {
            const replaceQuickfix = this.createFix(document, range, 'Alignment');
            replaceQuickfix.isPreferred = true;
            return [replaceQuickfix];
        }

        return [];
    }

    private createFix(document: vscode.TextDocument, range: vscode.Range, widgetName: string): vscode.CodeAction {
        const fix = new vscode.CodeAction(`Convert to ${widgetName}Directional`, vscode.CodeActionKind.QuickFix);
        fix.edit = new vscode.WorkspaceEdit();
        // fix.command = { command: CREATE_INTL_TEXT_COMMAND, arguments: [range], title: `Convert to ${widgetName}Directional`, tooltip: '' };
        let rangeText = document.getText(range);
        rangeText = rangeText.replace(widgetName,  `${widgetName}Directional`);
        rangeText = rangeText.replace('/left:/g', 'start:');
        rangeText = rangeText.replace('/right:/g', 'end:');
        rangeText = rangeText.replace('/Left/g', 'Start');
        rangeText = rangeText.replace('/Right/g', 'End');

        fix.edit.replace(document.uri,range, rangeText);
        
        return fix;
    }

    private createCommand(): vscode.CodeAction {
        const action = new vscode.CodeAction('convert to localized text', vscode.CodeActionKind.Empty);
        action.command = { command: CREATE_INTL_TEXT_COMMAND, title: 'convert to localized text', tooltip: 'You will enter the key for the string' };
        return action;
    }

    createLineDiagnostic(doc: vscode.TextDocument, lineOfText: vscode.TextLine, lineIndex: number): vscode.Diagnostic[] | undefined {
        const collections: vscode.Diagnostic[] = [];
        this._widgetTobeLocalized.forEach((value) => {
            const lineno = value.split('\n').length;
            let lineText = lineOfText.text;
            if(lineno > 1){
                lineText = doc.getText(new vscode.Range(lineOfText.range.start, new vscode.Position(lineIndex + lineno, 0)));
            }

            const startIndex = lineText.indexOf(value);
            if (startIndex == -1) return;

            let range = new vscode.Range(lineIndex, startIndex, lineIndex, startIndex + value.length);
            if( lineno > 1) {
                range = new vscode.Range(lineIndex, startIndex, lineIndex + lineno, 0);
            }

            const diagnostic = new vscode.Diagnostic(range, "should use localized widget instead",
                vscode.DiagnosticSeverity.Error);
            diagnostic.code = WIDGET_INSPECT;
            collections.push(diagnostic);
        });

        return collections;
    }

    createDiagnostic(doc: vscode.TextDocument): vscode.Diagnostic[] | undefined {
        if(doc.fileName.includes('packages/flutter/lib/src')) return undefined;

        try {
            const edgeInsetsRegx = 'EdgeInsets\\.([a-z])\\w+(\\s)*\\(\\n*(\\s*(.*?)(\\s*left\\s*:|\\s*right\\s*:)(.*?))+\\)';
            const positionedRegx = 'Positioned(\\s)*\\(\\n*((\\s*)((left:|right:)|(.*?))(.*?),)+';
            const brderRadiusonlyRegx = 'BorderRadius.only\\((\\n*(\\s*)((Left:|Right:)|(.*?))(.*?),)+?(\\s*\\),)';
            const alignmentRegx = 'Alignment.(center|top|bottom)+(Left|Right)+';

            const docText = doc.getText();
            var allmatches: string[] = [];

            var matchesText = docText.match(RegExp(edgeInsetsRegx, 'g'));
            if (matchesText && matchesText.length > 0) {
                allmatches = matchesText;
            }
            this._widgetTobeLocalized.push(...allmatches);


            var matchesText = docText.match(RegExp(positionedRegx, 'g'));
            if (matchesText && matchesText.length > 0) {
                allmatches = matchesText;
            }
            this._widgetTobeLocalized.push(...allmatches);

            var matchesText = docText.match(RegExp(brderRadiusonlyRegx, 'g'));
            if (matchesText && matchesText.length > 0) {
                allmatches = matchesText;
            }
            this._widgetTobeLocalized.push(...allmatches);

            var matchesText = docText.match(RegExp(alignmentRegx, 'g'));
            if (matchesText && matchesText.length > 0) {
                allmatches = matchesText;
            }
            this._widgetTobeLocalized.push(...allmatches);

        } catch (e) {
            console.log(e);
        }

        return undefined;
    }

}

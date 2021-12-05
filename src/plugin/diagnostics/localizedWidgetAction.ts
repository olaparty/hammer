import * as vscode from 'vscode';
import { ICodeAction } from './codeaction_interface';

const CREATE_INTL_TEXT_COMMAND = 'int_widget_replace';

/** Code that is used to associate diagnostic entries with code actions. */
const WIDGET_INSPECT = 'intl_widget_inspect';

const WIDGET_FIX_MESSAGE = "use localized widget instead";


/**
 * Provides code actions for converting :) to a smiley emoji.
 */
export class LocalizedWidgetAction implements ICodeAction {
    private _widgetTobeLocalized: string[] = [];
    private _widgetDetect: string[] = ['EdgeInsets', 'Positioned', 'BorderRadius', 'Alignment'];
    private _wdigetDetectRegex: string[] = [
        'EdgeInsets\\.([a-z])\\w+(\\s)*\\(\\n*(\\s*(.*?)(\\s*left\\s*:|\\s*right\\s*:)(.*?))+\\)',
        'Positioned(\\s)*\\(\\n*((\\s*)((left:|right:)|(.*?))(.*?),)+',
        'BorderRadius.only\\((\\n*(\\s*)((Left:|Right:)|(.*?))(.*?),)+?(\\s*\\),)',
        'Alignment.(center|top|bottom)+(Left|Right)+',
    ];

    public readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];

    public provideCodeActions(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction[] | undefined {
        const rangeText = document.getText(range);

        for (const widgetName of this._widgetDetect) {
            if (rangeText.startsWith(widgetName)) {
                const replaceQuickfix = this.createFix(document, range, widgetName);
                replaceQuickfix.isPreferred = true;
                return [replaceQuickfix];
            }
        }

        return [];
    }

    private createFix(document: vscode.TextDocument, range: vscode.Range, widgetName: string): vscode.CodeAction {
        const fix = new vscode.CodeAction(`Convert to ${widgetName}Directional`, vscode.CodeActionKind.QuickFix);
        fix.edit = new vscode.WorkspaceEdit();
        // fix.command = { command: CREATE_INTL_TEXT_COMMAND, arguments: [range], title: `Convert to ${widgetName}Directional`, tooltip: '' };
        let rangeText = document.getText(range);
        rangeText = rangeText.replace(widgetName, `${widgetName}Directional`);
        rangeText = rangeText.replace(new RegExp('left:', 'g'), 'start:');
        rangeText = rangeText.replace(new RegExp('right:', 'g'), 'end:');
        rangeText = rangeText.replace(new RegExp('Left', 'g'), 'Start');
        rangeText = rangeText.replace(new RegExp('Right', 'g'), 'End');

        fix.edit.replace(document.uri, range, rangeText);

        return fix;
    }

    createLineDiagnostic(doc: vscode.TextDocument, lineOfText: vscode.TextLine, lineIndex: number): vscode.Diagnostic[] | undefined {
        const collections: vscode.Diagnostic[] = [];
        
        this._widgetTobeLocalized.forEach((value) => {
            const lineno = value.split('\n').length;
            console.log(value);
            let lineText = lineOfText.text;
            if (lineno > 1) {
                lineText = doc.getText(new vscode.Range(lineOfText.range.start, new vscode.Position(lineIndex + lineno, 0)));
            }

            const startIndex = lineText.indexOf(value);
            if (startIndex == -1) return;

            let range = new vscode.Range(lineIndex, startIndex, lineIndex, startIndex + value.length);
            if (lineno > 1) {
                range = new vscode.Range(lineIndex, startIndex, lineIndex + lineno, 0);
            }

            const diagnostic = new vscode.Diagnostic(range, WIDGET_FIX_MESSAGE,
                vscode.DiagnosticSeverity.Error);
            diagnostic.code = WIDGET_INSPECT;
            
            collections.push(diagnostic);
        });
        

        return collections;
    }

    createDiagnostic(doc: vscode.TextDocument): vscode.Diagnostic[] | undefined {
        if (doc.fileName.includes('packages/flutter/lib/src')) return undefined;
        this._widgetTobeLocalized = [];
        
        try {
            const docText = doc.getText();

            for (const widgetRegex of this._wdigetDetectRegex) {
                var matchesText = docText.match(RegExp(widgetRegex, 'g'));
                if (matchesText && matchesText.length > 0) {
                    this._widgetTobeLocalized.push(...matchesText);
                }
            }

        } catch (e) {
            console.log(e);
        }

        return undefined;
    }
}

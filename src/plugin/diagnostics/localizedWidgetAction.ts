import * as vscode from 'vscode';
import { CommonUtil } from '../../util/commonUtil';
import { ICodeAction } from './codeaction_interface';

const CREATE_INTL_TEXT_COMMAND = 'int_widget_replace';

/** Code that is used to associate diagnostic entries with code actions. */
const WIDGET_INSPECT = 'intl_widget_inspect';

const WIDGET_FIX_MESSAGE = "use localized widget instead";


/**
 * Provides code actions for converting :) to a smiley emoji.
 */
export class LocalizedWidgetAction implements ICodeAction {
    private _widgetDetect: string[] = ['EdgeInsets', 'Positioned', 'BorderRadius', 'Alignment'];
    private _wdigetDetectRegex: RegExp[] = [
        /EdgeInsets\.([a-z])\w+(\s)*\(\n*(\s*(.*?)(\s*left\s*:|\s*right\s*:)(.*?))+\)/g,
        /Positioned(\s)*\(\n*((\s*)((left:|right:)|(.*?))(.*?),)+/g,
        /BorderRadius.only\((\n*(\s*)((Left:|Right:)|(.*?))(.*?),)+?(\s*\),)/g,
        /Alignment.(center|top|bottom)+(Left|Right)+/g,
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

        return collections;
    }

    createDiagnostic(doc: vscode.TextDocument): vscode.Diagnostic[] | undefined {
        if (doc.fileName.includes('packages/flutter/lib/src')) return undefined;
        const collections: vscode.Diagnostic[] = [];

        try {
            const docText = doc.getText();
            for (const textRegex of this._wdigetDetectRegex) {
                let match;
                while (match = textRegex.exec(docText)) {
                    const matchText = match[0];
                    let offset = 0;

                    const startPos = doc.positionAt(match.index + offset);
                    const endPos = doc.positionAt(match.index + matchText.length);
                    
                    collections.push({
                        code: WIDGET_FIX_MESSAGE,
                        message: WIDGET_FIX_MESSAGE,
                        range: new vscode.Range(startPos, endPos),
                        severity: vscode.DiagnosticSeverity.Error,
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

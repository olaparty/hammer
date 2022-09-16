import * as vscode from 'vscode';
/**
 * Provides code actions for converting :) to a smiley emoji.
 */
export class WrapObserverCodeActionProvider implements vscode.CodeActionProvider {
    public provideCodeActions(): vscode.Command[] {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return [];
        }

        const selectedText = editor.document.getText(getSelectedText(editor));
        const codeActions = [];
        if (selectedText !== '') {
            codeActions.push({
                command: "hammer.wrapObserver",
                title: "Wrap with Observer"
            });
        }
        return codeActions;
    }
}

export const wrapObserverCommand = async (args: any) => {
    let editor = vscode.window.activeTextEditor;
    if (!editor) { return; }
    const selectedText = getSelectedText(editor);
    const text = editor.document.getText(selectedText);
    const newTextWidget = `Observer(builder: (_) {return ${text};})`;

    await editor.edit(edit => {
      edit.replace(selectedText, newTextWidget);
    });
    await vscode.commands.executeCommand(
      "editor.action.formatDocument"
    );
  }

const getSelectedText = (editor: vscode.TextEditor): vscode.Selection => {
    let offset_l = editor.document.offsetAt(editor.selection.start);
    let offset_r = editor.document.offsetAt(editor.selection.end) - 1;
    let text = editor.document.getText();
    const re = /[^a-zA-Z]/;
    for (let index = (text.length - offset_l); index > 0; index--) {
        let textOff = text.charAt(offset_l);
        if (textOff !== '.' && re.test(textOff)) {
            offset_l++;
            if (/[^A-Z]/.test(text.charAt(offset_l))) {
                return new vscode.Selection(editor.document.positionAt(0), editor.document.positionAt(0));
            }
            let lineText: string = editor.document.lineAt(editor.document.positionAt(offset_l).line).text;
            if (lineText.indexOf('class') != -1 || lineText.indexOf('extends') != -1 || lineText.indexOf('with') != -1 || lineText.indexOf('implements') != -1 || lineText.indexOf('=') != -1) {
                return new vscode.Selection(editor.document.positionAt(0), editor.document.positionAt(0));
            }

            break;
        } else {
            offset_l--;
        }
    }
    let l = 0;
    let r = 0;
    for (let index = (text.length - offset_r); index < text.length; index++) {

        if (text.charAt(offset_r) === '(') {
            l++;
        }
        if (text.charAt(offset_r) === ')') {
            r++
        }

        if (r > l || index == text.length) {
            offset_r = 0;
            offset_l = 0;
            break;
        }

        if (l > 0 && l == r) {
            offset_r++;
            if (!nextElementIsValid(text, offset_r)) {
                offset_r = 0;
                offset_l = 0;
            }
            break;
        }
        offset_r++;

    }

    return new vscode.Selection(editor.document.positionAt(offset_l), editor.document.positionAt(offset_r));
};

const nextElementIsValid = (code: string, length: number): Boolean => {
    for (let index = 0; index < 1000; index++) {
        const text = code.charAt(length).trim();
        if (text) {
            if (/[;),\]]/.test(text)) {
                return true;
            } else {
                return false;
            }
        }
        length++;

    }
    return false;

};
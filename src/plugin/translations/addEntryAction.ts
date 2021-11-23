import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { PathUtil } from '../../util/pathUtil';

const cnJsonRelativePath = 'assets/locale/string_zh_CN.json';


class AddEntryAction {
    constructor(
        private workspaceRoot: string,
        private args: any,
    ) { }
    async run() {

        var editor = vscode.window.activeTextEditor;
        if (!editor) {
            return; // No open text editor
        }

        if (path.extname(editor.document.uri.path) !== '.dart') {
            vscode.window.showInformationMessage('active document is not dart file');
            return;
        }
        try {
            let range = this.args && (this.args as vscode.Range);
            editor.selection = new vscode.Selection(range.start, range.end)
        } catch (_) { }

        const selection = editor.selection;
        const currentLine = editor.document.lineAt(selection.active.line);

        var matches = currentLine.text.match(RegExp('\'(.*?)\'', 'g'));
        if (!matches || !matches.length) {
            matches = currentLine.text.match(RegExp('\"(.*?)\"', 'g'));
        }

        if (!matches || !matches.length) {
            vscode.window.showInformationMessage('current line does not contain dart string');
            return;
        }
        var selectText = matches[0];
        if (matches.length > 1) {
            for (let index = 0; index < matches.length; index++) {
                const value = matches[index];
                const startIndex = currentLine.text.indexOf(value);
                if (selection.start.character >= startIndex && selection.start.character <= startIndex + value.length) {
                    selectText = value;
                    break;
                }
            };
        }

        const packagePath = this._getPackagePath(editor.document.uri.path);
        const relativePackagePath = (packagePath ?? '').replace(this.workspaceRoot ?? '', '');
        const result = await vscode.window.showInputBox({
            placeHolder: `Enter the key of '${selectText}'`,
            prompt: `Save '${selectText}' into ${path.join(relativePackagePath, cnJsonRelativePath)}`,
        });

        this._addLocalEntry(result, selectText, packagePath);
    }


    private _getPackagePath(dir: string | undefined): string | undefined {
        if (dir == undefined) {
            var editor = vscode.window.activeTextEditor;
            dir = editor?.document.uri.path;
        }

        if (dir == this.workspaceRoot) return undefined;

        var parentDir = path.dirname(dir as string);

        var yamlFilePath = path.join(parentDir, 'pubspec.yaml');
        if (PathUtil.pathExists(yamlFilePath)) {
            return parentDir;
        }

        return this._getPackagePath(parentDir);
    }

    private _replaceEntryValue(value: string | undefined): string | undefined {
        if (!value) return undefined;

        let str = value;
        let values = [];
        let results = str.match(RegExp("\\${(.*?)}", 'g')) ?? [];
        for (let index = 0; index < results.length; index++) {
            values.push(results[index]);
            str = str.replace((results[index] as string), `%0`);
        }

        results = str.match(RegExp("\\$([^{]*?)(?=\\s)")) ?? [];
        for (let index = 0; index < results.length; index++) {
            values.push(results[index]);
            str = str.replace((results[index] as string), `%0`);
        }

        results = str.match(RegExp("%\\d", 'g')) ?? [];
        for (let index = 0; index < results.length; index++) {
            str = str.replace((results[index] as string), `%0`);
        }

        const matches = str.match(RegExp("%0", 'g')) ?? [];
        for (let index = 0; index < matches.length; index++) {
            str = str.replace((matches[index] as string), `%${index + 1}`);
        }

        return str;
    }

    private _addLocalEntry(entryName: string | undefined, entryValue: string | undefined, packageRoot: string | undefined): boolean {
        if (!packageRoot || !entryName || !entryValue) return false;

        // validate duplicated keys
        var cnJsonFile = path.join(packageRoot, cnJsonRelativePath);
        if (!PathUtil.pathExists(cnJsonFile)) {
            vscode.window.showWarningMessage(`file not exist ${cnJsonFile}`);
            return false;
        }

        var jsonData = JSON.parse(fs.readFileSync(cnJsonFile, 'utf8'));
        if (jsonData.hasOwnProperty(entryName)) {
            vscode.window.showErrorMessage(`duplicated key ${entryName}`);
            return false;
        }

        var rawEntryValue = entryValue;
        if (entryValue.startsWith('\'') || entryValue.startsWith('\"')) {
            rawEntryValue = entryValue.substring(1, entryValue.length - 1);
        }

        const value = this._replaceEntryValue(rawEntryValue);
        const hasParams = ((value ?? '').match(RegExp("%\\d", 'g')) ?? []).length > 0;

        // add entry into json files
        jsonData[entryName] = value;
        var newJsonData = JSON.stringify(jsonData, null, 4);
        fs.writeFileSync(cnJsonFile, newJsonData, 'utf-8');

        var editor = vscode.window.activeTextEditor;
        if (!editor) return false;
        var selection = editor.selection;
        const currentLine = editor.document.lineAt(selection.active.line);

        var startPos = currentLine.text.indexOf(entryValue);

        var start = new vscode.Position(selection.start.line, startPos);
        var end = new vscode.Position(selection.end.line, startPos + entryValue.length);

        // check import of current k.dart
        const relativePathToRoot = path.relative(editor.document.uri.fsPath, path.join(packageRoot, 'lib'));
        var shoudFixImport = this._shoudFixImport(editor, relativePathToRoot);

        const textToReplace = hasParams ? `K.${entryName}([])` : `K.${entryName}`;
        const textToJson = hasParams ? `\n\t///${value}\n\tstatic String ${entryName} (List<String> args){ return R.string('${entryName}',args: args);}\n`
            : `\n\t///${rawEntryValue}\n\tstatic String get ${entryName} => R.string('${entryName}');\n`;


        editor.edit(edit => {
            edit.replace(new vscode.Range(start, end), textToReplace);
            shoudFixImport && edit.insert(new vscode.Position(0, 0), `import \'${relativePathToRoot}/k.dart\';\n`);
        });

        // add entry into k.dart 
        var kdartFilePath = path.join(packageRoot, 'lib', 'k.dart');
        var insertPos = this._getKDartInsertPos(kdartFilePath);
        var pos = insertPos;
        var wseditor = new vscode.WorkspaceEdit();
        wseditor.insert(vscode.Uri.file(kdartFilePath), pos, textToJson);
        vscode.workspace.applyEdit(wseditor);

        return true;
    }

    private _shoudFixImport(editor: vscode.TextEditor, relativePath: string): boolean {
        const text = editor.document.getText();
        const matches = text.match(RegExp(`${relativePath}/k.dart\';`, 'g'));
        return !matches || !matches.length;
    }

    private _getKDartInsertPos(filepath: string): vscode.Position {
        if (PathUtil.pathExists(filepath)) {
            const kdartfile = fs.readFileSync(filepath, 'utf-8');
            const lines = kdartfile.split('\n');
            let endLineNo = lines.length - 1;

            for (let i = lines.length - 1; i >= 0; i--) {

                if (lines[i].includes('}')) {
                    endLineNo = i;
                    break;
                }
            }
            if (endLineNo < 0) endLineNo = 0;
            return new vscode.Position(endLineNo, 0);
        }

        return new vscode.Position(0, 0);
    }
}


export async function addEntry(args: any) {
    await new AddEntryAction(vscode.workspace.rootPath ?? '', args).run();
}

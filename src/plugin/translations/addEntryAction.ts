import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { PathUtil } from '../../util/pathUtil';
import { Constants } from '../../constants';
import { CommonUtil } from '../../util/commonUtil';
import { runProcess, safeSpawn } from '../../util/process';

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

        const packagePath = CommonUtil.getPackagePath(editor.document.uri.path);
        const relativePackagePath = (packagePath ?? '').replace(this.workspaceRoot ?? '', '');
        const result = await vscode.window.showInputBox({
            placeHolder: `Enter the key of '${selectText}'`,
            prompt: `Save '${selectText}' into ${path.join(relativePackagePath, cnJsonRelativePath)}`,
        });

        this._addLocalEntry(result, selectText, packagePath);
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

    private async _addLocalEntry(entryName: string | undefined, entryValue: string | undefined, packageRoot: string | undefined): Promise<Thenable<boolean> | boolean> {
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

        const editResults: Array<Thenable<boolean>> = Array();
        const value = this._replaceEntryValue(rawEntryValue);
        const hasParams = ((value ?? '').match(RegExp("%\\d", 'g')) ?? []).length > 0;
        
        // add entry into json files
        const formatJson = vscode.workspace.getConfiguration().get<boolean>(Constants.FORMAT_LANGUAGE_JSON);
        var valueWithoutBlank = value?.replace('\\n', '\n');
        if (formatJson) {
            jsonData[entryName] = valueWithoutBlank;
            var newJsonData = JSON.stringify(jsonData, null, 4);
            fs.writeFileSync(cnJsonFile, newJsonData, 'utf-8');
        } else {
            var wseditor = new vscode.WorkspaceEdit();
            var {indent, insertPos} = this._getCnJsonInsertPos(cnJsonFile);
            wseditor.insert(vscode.Uri.file(cnJsonFile), insertPos, `,\n${indent}\"${entryName}\":\"${valueWithoutBlank}\"`);
            editResults.push(vscode.workspace.applyEdit(wseditor));
        }

        var editor = vscode.window.activeTextEditor;
        if (!editor) return false;
        var selection = editor.selection;
        const currentLine = editor.document.lineAt(selection.active.line);

        var startPos = currentLine.text.indexOf(entryValue);

        var start = new vscode.Position(selection.start.line, startPos);
        var end = new vscode.Position(selection.end.line, startPos + entryValue.length);

        // check import of current k.dart
        const relativePathToRoot = path.relative(path.dirname(editor.document.uri.fsPath), path.join(packageRoot, 'lib'));
        var shoudFixImport = this._shoudFixImport(editor, path.join(relativePathToRoot, 'k.dart'));

        const textToReplace = hasParams ? `K.${entryName}([])` : `K.${entryName}`;
        const importResult = editor.edit(edit => {
            edit.replace(new vscode.Range(start, end), textToReplace);
            if (shoudFixImport && editor) {
                const importPotionRegex = editor.document.getText().match(RegExp('import'));
                var importPostion = new vscode.Position(0, 0);
                if (importPotionRegex && importPotionRegex.index) {
                    importPostion = editor.document.positionAt(Math.max(importPotionRegex.index));
                }
                edit.insert(importPostion, `import \'${relativePathToRoot}/k.dart\';\n`);
            }
        });
        editResults.push(importResult);

        var kdartGenFilePath = path.join(packageRoot, 'tools', 'kdart_cli', 'kdart_cli');
        /// run kdart_cli if bin exists, 
        if(PathUtil.pathExists(kdartGenFilePath)) {
            var result = await kdartGenAction(kdartGenFilePath, vscode.workspace.rootPath!)
            if(result != ''){
                vscode.window.showInformationMessage(`failed: ${result}`);
            }
        }else{
            // add entry into k.dart 
            var wseditor = new vscode.WorkspaceEdit();
            var kdartFilePath = path.join(packageRoot, 'lib', 'k.dart');
            var {indent, insertPos} = this._getKDartInsertPos(kdartFilePath);
            const textToJson = hasParams ? `\n${indent}// ${value}\n${indent}static String ${entryName} (List<String> args){ return R.string('${entryName}',args: args);}\n`
                : `\n${indent}/// ${rawEntryValue}\n${indent}static String get ${entryName} => R.string('${entryName}');\n`;
            wseditor.insert(vscode.Uri.file(kdartFilePath), insertPos, textToJson);
            editResults.push(vscode.workspace.applyEdit(wseditor));
        }
        
        return await Promise.all(editResults).then(
            (successList) => {
                for (const index in successList) {
                    if (successList[index]) {
                        vscode.window.showErrorMessage(`File edit failed`);
                        return false;
                    }
                }
                vscode.workspace.saveAll();
                return true;
            }
        );
    }

    private _shoudFixImport(editor: vscode.TextEditor, relativePath: string): boolean {
        const text = editor.document.getText();
        const relativeImport = `import(\\s)+\'${relativePath}\';`
        const packageImport = `import(\\s)+\'package:${CommonUtil.getCurrentPackageName()}/k.dart\';`;
        const matches = text.match(RegExp(`${relativeImport}|${packageImport}`, 'g'));

        return !matches || !matches.length;
    }

    private _getKDartInsertPos(filepath: string): {indent: String, insertPos: vscode.Position} {
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

            var indent = '\t';
            var endNotEmptyLineNo = endLineNo;
            while (lines[endNotEmptyLineNo].length <= 1 && endNotEmptyLineNo > 0) {
                endNotEmptyLineNo--;
            }
            const indentMatch = lines[endNotEmptyLineNo].match(RegExp(/(\s+)(?=\S)/));
            if (indentMatch != null && indentMatch.length > 0) {
                indent = indentMatch[0];
            }

            return {indent: indent, insertPos: new vscode.Position(endLineNo, 0)};
        }

        return {indent:'\t', insertPos: new vscode.Position(0, 0)};
    }

    private _getCnJsonInsertPos(filepath: string): {indent: String, insertPos: vscode.Position} {
        if (PathUtil.pathExists(filepath)) {
            const kdartfile = fs.readFileSync(filepath, 'utf-8');
            const lines = kdartfile.split('\n');
            let endLineNo = lines.length - 1;

            for (let i = lines.length - 1; i >= 0; i--) {

                if (lines[i].includes('}')) {
                    endLineNo = i - 1;
                    break;
                }
            }
            if (endLineNo < 0) endLineNo = 0;

            var indent = '\t';
            const indentMatch = lines[endLineNo].match(RegExp(/(\s+)(?=\S)/));
            if (indentMatch != null && indentMatch.length > 0) {
                indent = indentMatch[0];
            }

            const character =Math.max(0, lines[endLineNo].length);
            return {indent: indent, insertPos: new vscode.Position(endLineNo, character)};
        }

        return {indent:'\t', insertPos: new vscode.Position(0, 0)};
    }

    
}


const kdartGenAction = async (binPath: string, rootPath: string, args?: ReadonlyArray<string>, cwd?: string | undefined): Promise<string> => {
    if (!args) {
        args = [];
    }
    const currentDir = path.normalize(rootPath);
    if (!cwd) {
        cwd = currentDir;
    }
    const newArgs =  ["-p", currentDir];
    const env = {};
    const proc = await runProcess(binPath, newArgs, cwd, env, safeSpawn);
	if (proc.exitCode === 0) {
        return ''
	}

    return proc.stderr;
}

export async function addEntry(args: any) {
    await new AddEntryAction(vscode.workspace.rootPath ?? '', args).run();
}

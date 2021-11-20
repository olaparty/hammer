import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { PackageItem } from './localTreeItem';
import * as yaml from 'yaml';

const cnJsonRelativePath = 'assets/locale/string_zh_CN.json';

const LOCALDIR = 'assets/locale';

export class LocalTranslationsProvider implements vscode.TreeDataProvider<PackageItem> {
    private supportLans: Array<string>;

    constructor(private workspaceRoot: string | undefined) {
        this.supportLans = [];
    }

    private _onDidChangeTreeData: vscode.EventEmitter<PackageItem | undefined | null | void> = new vscode.EventEmitter<PackageItem | undefined | null | void>();

    getTreeItem(element: PackageItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: PackageItem): vscode.ProviderResult<PackageItem[]> {
        if (!this.workspaceRoot) {
            // vscode.window.showInformationMessage('No PackageItem in empty workspace');
            return Promise.resolve([]);
        }
        if (element) {
            const yamlPath = path.join(this.workspaceRoot, element.rawFilePath, 'pubspec.yaml');
            return Promise.resolve(
                this.getSupportLans(
                    yamlPath
                )
            );
        } else {
            const pubspecYamlPath = path.join(this.workspaceRoot, 'pubspec.yaml');
            if (this.pathExists(pubspecYamlPath)) {
                return Promise.resolve(this._loadIntlMap());
            } else {
                // vscode.window.showInformationMessage('Workspace has no pubspec.yaml');
                return Promise.resolve([]);
            }
        }
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    async addEntry() {
        var editor = vscode.window.activeTextEditor;
        if (!editor) {
            return; // No open text editor
        }

        if (path.extname(editor.document.uri.path) !== '.dart') {
            vscode.window.showInformationMessage('active document is not dart file');
            return;
        }

        const selection = editor.selection;
        const currentLine = editor.document.lineAt(selection.active.line);
        var matches = currentLine.text.match(RegExp('\'(.*?)\'', 'g'));
        if(!matches || !matches.length){
            matches = currentLine.text.match(RegExp('\"(.*?)\"', 'g'));
        }

        if(!matches || !matches.length){
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
            placeHolder: `input the key of '${selectText}'`,
            prompt: `Save '${selectText}' into ${path.join(relativePackagePath, cnJsonRelativePath)}`,
        });
        
        this._addLocalEntry(result, selectText, packagePath);
    }

    showEntry(node: PackageItem): void {
        vscode.window.showTextDocument(vscode.Uri.parse(node.rawFilePath), {});
    }

    private _getPackagePath(dir: string | undefined): string | undefined {
        if (dir == undefined) {
            var editor = vscode.window.activeTextEditor;
            dir = editor?.document.uri.path;
        }

        if (dir == this.workspaceRoot) return undefined;

        var parentDir = path.dirname(dir as string);

        var yamlFilePath = path.join(parentDir, 'pubspec.yaml');
        if (this.pathExists(yamlFilePath)) {
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
        if (!this.pathExists(cnJsonFile)) {
            vscode.window.showWarningMessage(`file not exist ${cnJsonFile}`);
            return false;
        }

        var jsonData = JSON.parse(fs.readFileSync(cnJsonFile, 'utf8'));
        if (jsonData.hasOwnProperty(entryName)) {
            vscode.window.showErrorMessage(`duplicated key ${entryName}`);
            return false;
        }

        var rawEntryValue = entryValue;
        if(entryValue.startsWith('\'') || entryValue.startsWith('\"')){
            rawEntryValue = entryValue.substring(1,entryValue.length -1);
        }

        const value = this._replaceEntryValue(rawEntryValue);
        const hasParams = ((value??'').match(RegExp("%\\d", 'g')) ?? []).length > 0;

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
        const relativePathToRoot = path.relative(editor.document.uri.fsPath, path.join(packageRoot,'lib'));
        var shoudFixImport = this._shouldInsertKdart(editor.document.uri.path, relativePathToRoot);

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

    private _loadIntlMap(): PackageItem[] {
        var rootPath = this.workspaceRoot ?? '';

        const roomYaml = path.join(rootPath, 'pubspec.yaml');
        const packagePubspec = yaml.parse(fs.readFileSync(roomYaml, 'utf8'));
        this.supportLans = packagePubspec.flutter["assets-filter"];

        const toDep = (packageName: string, packageData: any): PackageItem | undefined => {
            if (typeof packageData === 'object' && typeof packageData.path === 'string' &&
                this.pathExists(path.join(rootPath, packageData.path))) {
                const subpath = path.join(path.dirname(roomYaml), packageData.path, cnJsonRelativePath);
                if (this.pathExists(subpath)) {
                    return new PackageItem(packageName, this.supportLans.join(','), packageData.path, vscode.TreeItemCollapsibleState.Collapsed);
                }
            }

            return undefined;
        };

        const deps = packagePubspec.dependencies
            ? Object.keys(packagePubspec.dependencies).map(dep =>
                toDep(dep, packagePubspec.dependencies[dep])).filter(item => item !== undefined)
            : Array();
        deps.push(
            new PackageItem(path.basename(path.dirname(roomYaml)), this.supportLans.join(','), '', vscode.TreeItemCollapsibleState.Collapsed)
        );
        return deps;
    }

    private _shouldInsertKdart(filepath: string, relativePath: string): boolean {
        const kdartfile = fs.readFileSync(filepath, 'utf-8');
        const lines = kdartfile.split('\n');

        for (let i = 0; i < 30 && i < lines.length; i++) {
            if (lines[i].includes(`${relativePath}/k.dart\';`)) {
                return false;
            }
        }
        return true;
    }

    private _getKDartInsertPos(filepath: string): vscode.Position {
        if (this.pathExists(filepath)) {
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


    private getSupportLans(packagePubspecPath: string): PackageItem[] {
        if (this.pathExists(packagePubspecPath)) {

            // const packagePubspec = yaml.load(fs.readFileSync(packagePubspecPath, 'utf8'));
            var result: PackageItem[] = [];
            this.supportLans.forEach((value) => {
                const subpath = path.join(path.dirname(packagePubspecPath), LOCALDIR, `string_${value}.json`);
                result.push(new PackageItem(value, subpath, subpath, vscode.TreeItemCollapsibleState.None));
            });

            return result;

        } else {
            return [];
        }
    }

    private pathExists(p: string): boolean {
        try {
            fs.accessSync(p);
        } catch (err) {
            return false;
        }
        return true;
    }
}


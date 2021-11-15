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
        const text = editor.document.getText(selection);
        const packagePath = this._getPackagePath(editor.document.uri.path);
        const relativePackagePath = (packagePath ?? '').replace(this.workspaceRoot ?? '', '');
        const result = await vscode.window.showInputBox({
            placeHolder: `input the key of '${text}'`,
            prompt: `Save '${text}' into ${path.join(relativePackagePath, cnJsonRelativePath)}`,
        });
        
        this._addLocalEntry(result, text, packagePath);
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

    private _addLocalEntry(entryName: string | undefined, entryValue: string | undefined, packageRoot: string | undefined): boolean {
        if (!packageRoot || !entryName) return false;

        // validate duplicated keys
        var cnJsonFile = path.join(packageRoot, cnJsonRelativePath);
        if (!this.pathExists(cnJsonFile)) {
            vscode.window.showInformationMessage(`file not exist ${cnJsonFile}`);
            return false;
        }

        var jsonData = JSON.parse(fs.readFileSync(cnJsonFile, 'utf8'));
        if (jsonData.hasOwnProperty(entryName)) {
            vscode.window.showInformationMessage(`duplicated key ${entryName}`);
            return false;
        }

        // add entry into json files
        jsonData[entryName] = entryValue;
        var newJsonData = JSON.stringify(jsonData, null, 4);
        fs.writeFileSync(cnJsonFile, newJsonData, 'utf-8');

        var editor = vscode.window.activeTextEditor;
        if (!editor) return false;
        var selection = editor.selection;

        var start = new vscode.Position(selection.start.line, selection.start.character - 1);
        var end = new vscode.Position(selection.end.line, selection.end.character + 1);
        // check import of current k.dart
        var shoudFixImport = this._shouldInsertKdart(editor.document.uri.path, '');
        editor.edit(edit => {
            edit.replace(new vscode.Range(start, end), `K.${entryName}`);
            shoudFixImport && edit.insert(new vscode.Position(0, 0), `import \'package:login/k.dart\';\n`);
        });

        // add entry into k.dart 
        var kdartFilePath = path.join(packageRoot, 'lib', 'k.dart');
        var insertPos = this._getKDartInsertPos(kdartFilePath);
        var pos = insertPos;
        var wseditor = new vscode.WorkspaceEdit();
        wseditor.insert(vscode.Uri.file(kdartFilePath), pos, `\n\t///${entryValue}\n\tstatic String get ${entryName} => R.string('${entryName}');\n`);
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

    private _shouldInsertKdart(filepath: string, packageName: string): boolean {
        const kdartfile = fs.readFileSync(filepath, 'utf-8');
        const lines = kdartfile.split('\n');
        for (let i = 0; i < 30 && i < lines.length; i++) {
            if (lines[i].includes(`${packageName}/k.dart\';`)) {
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

    // private getSelectionInPackageJson(node: PackageItem): vscode.Range {
    //     if (this.pathExists(node.packagePubspecPath)) {
    //         const packageJson = fs.readFileSync(node.packagePubspecPath, 'utf-8');
    //         const lines = packageJson.split('\n');
    //         for (let i = 0; lines.length; i++) {
    //             const pos = lines[i].indexOf(`"${node.label}"`);
    //             if (pos > 0) {
    //                 return new vscode.Range(i, pos + 1, i, pos + node.label.length + 1);
    //             }
    //         }
    //     }
    //     return new vscode.Range(0, 0, 0, 0);
    // }

    private getSupportLans(packagePubspecPath: string): PackageItem[] {
        if (this.pathExists(packagePubspecPath)) {

            // const packagePubspec = yaml.load(fs.readFileSync(packagePubspecPath, 'utf8'));
            var result: PackageItem[] = [];
            this.supportLans.forEach((value, index) => {
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


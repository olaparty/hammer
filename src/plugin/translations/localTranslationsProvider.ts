import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { PackageItem } from './localTreeItem';
import * as yaml from 'yaml';
import { PathUtil } from '../../util/pathUtil';

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
            if (PathUtil.pathExists(pubspecYamlPath)) {
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

    showEntry(node: PackageItem): void {
        vscode.window.showTextDocument(vscode.Uri.parse(node.rawFilePath), {});
    }


    private _loadIntlMap(): PackageItem[] {
        var rootPath = this.workspaceRoot ?? '';

        const roomYaml = path.join(rootPath, 'pubspec.yaml');
        const packagePubspec = yaml.parse(fs.readFileSync(roomYaml, 'utf8'));
        this.supportLans = packagePubspec.flutter["assets-filter"];

        const toDep = (packageName: string, packageData: any): PackageItem | undefined => {
            if (typeof packageData === 'object' && typeof packageData.path === 'string' &&
                PathUtil.pathExists(path.join(rootPath, packageData.path))) {
                const subpath = path.join(path.dirname(roomYaml), packageData.path, cnJsonRelativePath);
                if (PathUtil.pathExists(subpath)) {
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

    private getSupportLans(packagePubspecPath: string): PackageItem[] {
        if (PathUtil.pathExists(packagePubspecPath)) {

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
}


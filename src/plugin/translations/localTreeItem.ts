import * as path from 'path';
import * as vscode from 'vscode';
import { Constants } from '../../constants';

export class PackageItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        private version: string,
        public readonly rawFilePath: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    ) {
        super(label, collapsibleState);
        this.tooltip = `${this.label}-${this.version}`;
        this.description = this.version;
        const type = vscode.TreeItemCollapsibleState.None ? '-sub' : '';
        this.contextValue = 'PackageItem' + type;
        this.iconPath =Constants.EXTENSION_CONTEXT.asAbsolutePath(path.join('resources', 'light', 'folder.svg'));
        
        if(collapsibleState === vscode.TreeItemCollapsibleState.None){
            this.command = {
                "title": "Show json file",
                "command": "localTranslations.showEntry",
                "arguments": [this]
            };
        }
    }
}
import * as path from 'path';
import * as vscode from 'vscode';
import * as util from 'util';
import * as glob from 'glob';
import { CrowdinClient } from '../../client/crowdinClient';
import { ErrorHandler } from '../../util/errorHandler';
import { SourceFiles } from '../../model/sourceFiles';
import { CrowdinConfigHolder } from '../crowdinConfigHolder';
import { CommonUtil } from '../../util/commonUtil';
import * as fs from 'fs';
import * as yaml from 'yaml';
import { diffProcess } from '../../util/gitcommand';
import { Constants } from '../../constants';

const asyncGlob = util.promisify(glob);

export const openSearchTranslations = () => {
    vscode.commands.executeCommand('search.action.openNewEditorToSide', '**/assets/locale/*.json');
}

export const downloadTranslation = (configHolder: CrowdinConfigHolder) => {
    return CommonUtil.withProgress(
        async () => {
            try {

                var config: any;
                var workspace: any;
                for (let elem of configHolder.configurations.entries()) {
                    config = elem[0];
                    workspace = elem[1];
                }

                const root = config.basePath ? path.join(workspace.uri.fsPath, config.basePath) : workspace.uri.fsPath;
                

                const promises = config.files
                    .map(async (f: { source: string; directory:any, translation: any, languageMapping:any, dest: string }) => {

                        let foundFiles = await asyncGlob(f.source, { cwd: root, root: root });
                        const sourceFiles: SourceFiles = {
                            files: foundFiles,
                            sourcePattern: f.source,
                            directoryPattern: f.directory,
                            translationPattern: f.translation,
                            languageMapping: f.languageMapping,
                            dest: f.dest
                        };
                        return sourceFiles;
                    });
                    const editor = vscode.window.activeTextEditor;
                    let branch = undefined
                if(editor) {
                    branch = CommonUtil.getCurrentGitBranch(editor.document.uri)
                }
                if (branch !== undefined) {
                    if (branch === 'main') {
                        branch = undefined
                    } else {
                        branch = branch.replace(/[^\w\s-]/gi, "-")
                    }
                    
                }
                
                const client = new CrowdinClient(
                    config.projectId, config.apiKey, branch, config.organization,undefined
                );
                const sourceFilesArr = await Promise.all(promises);
                //@ts-ignore
                await client.download(root, sourceFilesArr);

                const rootChanges = await diffProcess("**/assets/locale/*.json", ["-w", "--name-only"]);
                const baseChanges = await diffProcess("**/assets/locale/*.json", ["-w", "--name-only"], path.join(vscode.workspace.rootPath??'', Constants.DEFAULT_MODULE_DIR));
                
                vscode.window.showInformationMessage(`sync finished \n${rootChanges}\n${baseChanges}`);
            } catch (err) {
                ErrorHandler.handleError(err);
            }
        },
        `Downloading translations...`
    );
};
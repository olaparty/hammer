import * as path from 'path';
import * as vscode from 'vscode';
import * as util from 'util';
import * as glob from 'glob';
import { ErrorHandler } from '../../util/errorHandler';
import { CrowdinConfigHolder } from '../crowdinConfigHolder';
import { CommonUtil } from '../../util/commonUtil';
import * as fs from 'fs';
import * as yaml from 'yaml';
import { Constants } from '../../constants';
import { CrowdinClient } from '../../client/crowdinClient';
import { PathUtil } from '../../util/pathUtil';
import { GitExtension } from '../../typings/git';


const jsonRelativePath = 'assets/locale/%type%_%lan%.json';

interface TranslateItem {
    fileName: string;
    localPath: string;
    remotePath?: string;
    type: string;
    fileId?: number;
}


const _parseUntranslateItems = async (dir: string, type: string, module?: string): Promise<TranslateItem[]> => {
    const untranslateItems: TranslateItem[] = [];
    try {
        const cnJsonRelativePath = jsonRelativePath.replace('%type%', type).replace('%lan%', 'zh_CN');
        const cnfilepath = path.normalize(path.join(dir, cnJsonRelativePath));

        if (!fs.existsSync(cnfilepath)) return untranslateItems;
        var hasDiff = false
        const editor = vscode.window.activeTextEditor;
                        if(editor) {
                            hasDiff = await hasFileDiff(editor.document.uri, cnfilepath)
                        }
        if (hasDiff) {
            untranslateItems.push({
                type: type,
                localPath: cnfilepath,
                fileName: `${module}_${type}.json`,
            });
        }

    } catch (e) {
        console.error(e);
    }

    return untranslateItems

};


async function hasFileDiff(docUri: vscode.Uri, filePath: string): Promise<boolean> {
    const extension = vscode.extensions.getExtension<GitExtension>("vscode.git");
    
    if (!extension) {
      console.warn("Git extension not available");
      return false;
    }
    if (!extension.isActive) {
      console.warn("Git extension not active");
      return false;
    }

    const git = extension.exports.getAPI(1);
    const repository = git.getRepository(docUri);
    if (!repository) {
      console.warn("No Git repository for current document", docUri);
      return false;
    }
    
    const main = (await repository.getBranch("main")).commit;
    if (main != null) {
        return (await (repository.diffWith(main, filePath))).length > 0
    }
    return false;
    
}



export const uploadTranslationSource = (arg: vscode.Uri, configHolder: CrowdinConfigHolder) => {
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

                const jsonFileName = path.basename(arg.fsPath);
                if (jsonFileName.startsWith("string_") || jsonFileName.startsWith("array_")) {
                    const newjsonFileName = jsonFileName.startsWith("string_") ? "string_zh_CN.json" : "array_zh_CN.json";

                    const filePath = arg.fsPath.replace(jsonFileName, newjsonFileName);
                    if (PathUtil.pathExists(filePath)) {
                        const basefilePath = filePath.replace(root, "");

                        const answer = await vscode.window.showInformationMessage(
                            `Upload local changes\n${basefilePath}`,
                            { modal: true },
                            ...["Yes", "No"]
                        );
                        if (answer != 'Yes') {
                            return;
                        }

                        const moduleNameRegex = /\w+(?=\/assets\/locale\/(string_|array_))/;
                        const matches = moduleNameRegex.exec(basefilePath);
                        let moduleName = "";

                        if (!matches?.length) {
                            if (basefilePath.includes("assets/locale/")) {
                                moduleName = Constants.ROOT_MODULE_NAME;
                            }
                        } else {
                            moduleName = matches[0];
                        }
                        const typeName = jsonFileName.startsWith("string_") ? "string" : "array";
                        const fileName = `${moduleName}_${typeName}.json`;

                        const editor = vscode.window.activeTextEditor;
                let branch = undefined
                if(editor) {
                    branch = CommonUtil.getCurrentGitBranch(editor.document.uri)
                }
                if (branch !== undefined) {
                    if (branch === 'main') {
                        branch = undefined
                    } else {
                        branch = branch.replace(/[^a-zA-Z0-9]/g, "-")
                    }
                    
                }

                        const client = new CrowdinClient(
                            config.projectId, config.apiKey, branch, config.organization
                        );

                        await client.upload(
                            filePath,
                            "",
                            "/client/"+fileName,
                        )
                        // if (!!config.directoryId) {
                        //     //@ts-ignore
                        //     const files = await client.getDirectoryFiles(config.directoryId);

                        //     const foundFile = files?.data.find(f => f.data.name === fileName);
                        //     const fileId = foundFile?.data.id;
                        //     const rawData = fs.readFileSync(filePath) // alias as Latin-1 stands for ISO-8859-1. 
                        //     if (fileId) {
                        //         await client.uploadFile(fileName, fileId, rawData, '');
                        //     }
                        // }

                        vscode.window.showInformationMessage(`Upload finished \n${basefilePath}`);
                    }
                }




            } catch (err) {
                ErrorHandler.handleError(err);
            }
        },
        `Uploading translations...`
    );
};


export const uploadTranslations = (configHolder: CrowdinConfigHolder) => {
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

                const pubYaml = path.join(root, 'pubspec.yaml');
                const packagePubspec = yaml.parse(fs.readFileSync(pubYaml, 'utf8'));

                const untranslateItems: TranslateItem[] = [];
                const dependencies = Object.keys(packagePubspec.dependencies);
                dependencies.push(Constants.ROOT_MODULE_NAME);
                for (const module of dependencies) {
                    const filepath = (module == Constants.ROOT_MODULE_NAME) ? '.' : module;
                    const moduleName = (module == Constants.ROOT_MODULE_NAME) ? '' : Constants.DEFAULT_MODULE_DIR;
                    const modulePath = path.join(root, moduleName, filepath);
                    untranslateItems.push(...(await _parseUntranslateItems(modulePath, 'string', module)));
                    untranslateItems.push(...(await _parseUntranslateItems(modulePath, 'array', module)));
                }

                if (untranslateItems.length == 0) {
                    vscode.window.showInformationMessage(`no local changes`);
                    return;
                }

                const fileMap: Map<string, TranslateItem> = new Map<string, TranslateItem>();
                untranslateItems.forEach((value, _) => {
                    if (!fileMap.get(value.fileName)) {
                        fileMap.set(value.fileName, value);
                    }
                });
                const answer = await vscode.window.showInformationMessage(
                    `Comparing with main, Upload local changes\n${Array.from(fileMap.keys()).join('\n')}`,
                    { modal: true },
                    ...["Yes", "No"]
                );

                if (answer != 'Yes') {
                    return;
                }

                const editor = vscode.window.activeTextEditor;
                let branch = undefined
                if(editor) {
                    branch = CommonUtil.getCurrentGitBranch(editor.document.uri)
                }
                if (branch !== undefined) {
                    if (branch === 'main') {
                        const answer = await vscode.window.showInformationMessage(
                            `Override translations in main?`,
                            { modal: true },
                            ...["Yes", "No"]
                        );
        
                        if (answer != 'Yes') {
                            return;
                        }
                        branch = undefined
                    } else {
                        branch = branch.replace(/[^\w\s-]/gi, "-")
                    }
                    
                }

                

                

                const client = new CrowdinClient(
                    config.projectId, config.apiKey, branch, config.organization,
                );

                const updatedFiles: string[] = [];
                for (const [key, val] of fileMap) {
                    
                    await client.upload(
                        val.localPath,
                        "",
                        "/client/"+key,
                    )
                    updatedFiles.push(key);
                }

                vscode.window.showInformationMessage(`Upload finished \n${updatedFiles.join('\n')}`);

            } catch (err) {
                ErrorHandler.handleError(err);
            }
        },
        `Uploading translations...`
    );
};
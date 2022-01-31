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


const jsonRelativePath = 'assets/locale/%type%_%lan%.json';

interface TranslateItem {
    fileName: string;
    localPath: string;
    remotePath?: string;
    name: string;
    value: string;
    type: string;
    fileId?: number;
}


const _parseUntranslateItems = (dir: string, type: string, module?: string): TranslateItem[] => {
    const untranslateItems: TranslateItem[] = [];
    try {
        const cnJsonRelativePath = jsonRelativePath.replace('%type%', type).replace('%lan%', 'zh_CN');
        const twJsonRelativePath = jsonRelativePath.replace('%type%', type).replace('%lan%', 'zh_TW');
        const cnfilepath = path.normalize(path.join(dir, cnJsonRelativePath));
        const twfilepath = path.normalize(path.join(dir, twJsonRelativePath));

        if (!fs.existsSync(cnfilepath)) return untranslateItems;

        const cnMap = JSON.parse(fs.readFileSync(cnfilepath, 'utf8'));
        const twMap = JSON.parse(fs.readFileSync(twfilepath, 'utf8'));

        const twKeys = Object.keys(twMap);
        const cnKeys = Object.keys(cnMap);
        const difference = cnKeys.filter(key => {
            var notIncludes = !twKeys.includes(key);
            if (!notIncludes && type == 'array') {
                notIncludes = (twMap[key].length != cnMap[key].length);
            }
            return notIncludes;
        });

        if (!!difference && difference.length > 0) {
            difference.forEach((key, _) => {
                untranslateItems.push({
                    type: type,
                    localPath: cnfilepath,
                    fileName: `${module}_${type}.json`,
                    name: key,
                    value: cnMap[key]
                });

                twMap[key] = cnMap[key];
            });
        }

    } catch (e) {
        console.error(e);
    }

    return untranslateItems

};


const _saveUpdatedItems = (localPath: string): TranslateItem[] => {
    const untranslateItems: TranslateItem[] = [];
    try {
        const twLocalPath = localPath.replace('zh_CN', 'zh_TW');
        const cnfilepath = localPath;
        const twfilepath = twLocalPath;

        if (!fs.existsSync(cnfilepath)) return untranslateItems;

        const cnMap = JSON.parse(fs.readFileSync(cnfilepath, 'utf8'));
        const twMap = JSON.parse(fs.readFileSync(twfilepath, 'utf8'));

        const isTypeArray = path.basename(localPath).includes('array');

        const twKeys = Object.keys(twMap);
        const cnKeys = Object.keys(cnMap);
        const difference = cnKeys.filter(key => {
            var notIncludes = !twKeys.includes(key);
            if (!notIncludes && isTypeArray) {
                notIncludes = (twMap[key].length != cnMap[key].length);
            }
            return notIncludes;
        });

        if (!!difference && difference.length > 0) {
            difference.forEach((key, _) => {

                twMap[key] = cnMap[key];
            });

            var newJsonData = JSON.stringify(twMap, null, 4);
            fs.writeFileSync(twfilepath, newJsonData, 'utf-8');
        }


    } catch (e) {
        console.error(e);
    }

    return untranslateItems

};

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

                        const client = new CrowdinClient(
                            config.projectId, config.apiKey, config.branch, config.organization
                        );
                        if (!!config.directoryId) {
                            //@ts-ignore
                            const files = await client.getDirectoryFiles(config.directoryId);

                            const foundFile = files?.data.find(f => f.data.name === fileName);
                            const fileId = foundFile?.data.id;
                            const rawData = fs.readFileSync(filePath) // alias as Latin-1 stands for ISO-8859-1. 
                            if (fileId) {
                                await client.uploadFile(fileName, fileId, rawData, '');
                            }
                        }

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

                dependencies.forEach((module, _) => {
                    const filepath = (module == Constants.ROOT_MODULE_NAME) ? '.' : module;
                    const moduleName = (module == Constants.ROOT_MODULE_NAME) ? '' : Constants.DEFAULT_MODULE_DIR;
                    const modulePath = path.join(root, moduleName, filepath);
                    untranslateItems.push(..._parseUntranslateItems(modulePath, 'string', module));
                    untranslateItems.push(..._parseUntranslateItems(modulePath, 'array', module));
                });

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
                    `Upload local changes\n${Array.from(fileMap.keys()).join('\n')}`,
                    { modal: true },
                    ...["Yes", "No"]
                );

                if (answer != 'Yes') {
                    return;
                }

                const client = new CrowdinClient(
                    config.projectId, config.apiKey, config.branch, config.organization,
                );
                if (!!config.directoryId) {
                    //@ts-ignore
                    const files = await client.getDirectoryFiles(config.directoryId);

                    fileMap.forEach((value, key) => {
                        //@ts-ignore
                        const foundFile = files.data.find(f => f.data.name === key);
                        value.fileId = foundFile?.data.id;
                        value.remotePath = foundFile?.data.path;
                    });
                }

                const updatedFiles: string[] = [];
                const keys = fileMap.keys();
                for (const key of keys) {
                    // TODO: use promise to decrease the uploading duration
                    const value = fileMap.get(key);

                    if (!value || !value.fileId || !value.remotePath) continue;

                    updatedFiles.push(key);
                    // TODO: merge remote content.
                    // await client.getSourceFileContent(fileid);
                    // merge content.

                    const rawData = fs.readFileSync(value.localPath) // alias as Latin-1 stands for ISO-8859-1. 
                    //@ts-ignore
                    await client.uploadFile(key, value.fileId, rawData);

                    // save updated record
                    _saveUpdatedItems(value.localPath);
                }

                vscode.window.showInformationMessage(`Upload finished \n${updatedFiles.join('\n')}`);

            } catch (err) {
                ErrorHandler.handleError(err);
            }
        },
        `Uploading translations...`
    );
};
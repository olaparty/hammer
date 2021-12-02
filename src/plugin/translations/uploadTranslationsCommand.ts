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


const jsonRelativePath = 'assets/locale/%type%_%lan%.json';

interface TranslateItem {
    fileName: string;
    localPath: string;
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

            //// TODO: save changes into tw files
            // var newJsonData = JSON.stringify(twMap, null, 4);
            // fs.writeFileSync(twfilepath, newJsonData, 'utf-8');
        }
        

    } catch (e) {
        console.error(e);
    }

    return untranslateItems

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

                const roomYaml = path.join(root, 'pubspec.yaml');
                const packagePubspec = yaml.parse(fs.readFileSync(roomYaml, 'utf8'));

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
                  {modal: true},
                  ...["Yes", "No"]
                );
                
                if(answer != 'Yes') {
                    return;
                }

                const client = new CrowdinClient(
                    config.projectId, config.apiKey, config.branch
                );
                if (!!config.directoryId) {
                    //@ts-ignore
                    const files = await client.getDirectoryFiles(config.directoryId);

                    fileMap.forEach((value, key) => {
                        //@ts-ignore
                        const foundFile = files.data.find(f => f.data.name === key);
                        value.fileId = foundFile?.data.id;
                    });
                }

                const updatedFiles: string[] = [];
                fileMap.forEach(async (value, key) => {
                    if(!value.fileId) return;
                    
                    updatedFiles.push(value.localPath.replace(root, ''));
                    // TODO: merge remote content.
                    // await client.getSourceFileContent(fileid);
                    // merge content.
                    
                    const content = fs.readFileSync(value.localPath, 'binary') // alias as Latin-1 stands for ISO-8859-1. 
                    //@ts-ignore
                    await client.uploadFile(key, value.fileId, content);
                });

                vscode.window.showInformationMessage(`Upload finished \n${updatedFiles.join('\n')}`);

            } catch (err) {
                ErrorHandler.handleError(err);
            }
        },
        `Uploading translations...`
    );
};
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
import { diffProcess, getChangedKeysVsMain } from '../../util/gitcommand';
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
                        branch = branch.replace(/[^a-zA-Z0-9]/g, "-")
                    }
                    
                }
                
                const isOnFeatureBranch = branch !== undefined;

                type Snapshot = { raw: string; parsed: Record<string, unknown> };

                const snapshotJsonFiles = async (pattern: string): Promise<Map<string, Snapshot>> => {
                    const snapshots = new Map<string, Snapshot>();
                    const files = await asyncGlob(pattern, { cwd: root, root: root });
                    for (const f of files) {
                        const fullPath = path.join(root, f);
                        if (fs.existsSync(fullPath)) {
                            try {
                                const raw = fs.readFileSync(fullPath, 'utf-8');
                                snapshots.set(fullPath, { raw, parsed: JSON.parse(raw) });
                            } catch { /* skip unparseable files */ }
                        }
                    }
                    return snapshots;
                };

                let changedKeys = new Set<string>();
                let enSnapshots = new Map<string, Snapshot>();
                let zhTWSnapshots = new Map<string, Snapshot>();

                if (isOnFeatureBranch) {
                    changedKeys = await getChangedKeysVsMain(
                        vscode.workspace.rootPath ?? '',
                        '**/assets/locale/*_zh_CN.json'
                    );
                    enSnapshots = await snapshotJsonFiles('**/assets/locale/*_en.json');
                    zhTWSnapshots = await snapshotJsonFiles('**/assets/locale/*_zh_TW.json');
                }

                const client = new CrowdinClient(
                    config.projectId, config.apiKey, branch, config.organization,undefined
                );
                const sourceFilesArr = await Promise.all(promises);
                //@ts-ignore
                await client.download(root, sourceFilesArr, config);

                if (isOnFeatureBranch) {
                    const applyPartialMerge = (
                        snapshots: Map<string, Snapshot>,
                        keys: Set<string>
                    ) => {
                        for (const [filePath, { raw: originalRaw, parsed: snapshot }] of snapshots) {
                            if (!fs.existsSync(filePath)) continue;
                            try {
                                const downloaded: Record<string, unknown> = JSON.parse(
                                    fs.readFileSync(filePath, 'utf-8')
                                );

                                let result = originalRaw;
                                const keysToAppend: string[] = [];

                                for (const key of keys) {
                                    if (!(key in downloaded)) continue;
                                    const newValue = JSON.stringify(downloaded[key]);

                                    if (key in snapshot) {
                                        // Replace only the value in-place, preserving surrounding formatting
                                        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                        result = result.replace(
                                            new RegExp(`("${escapedKey}"\\s*:\\s*)"(?:[^"\\\\]|\\\\.)*"`),
                                            `$1${newValue}`
                                        );
                                    } else {
                                        keysToAppend.push(key);
                                    }
                                }

                                if (keysToAppend.length > 0) {
                                    const indentMatch = result.match(/\n([ \t]+)"/);
                                    const indent = indentMatch ? indentMatch[1] : '    ';
                                    const closingIdx = result.lastIndexOf('}');
                                    if (closingIdx !== -1) {
                                        const before = result.slice(0, closingIdx).trimEnd();
                                        const comma = before.endsWith(',') ? '' : ',';
                                        const newEntries = keysToAppend
                                            .map(k => `${indent}"${k}": ${JSON.stringify(downloaded[k])}`)
                                            .join(',\n');
                                        result = before + comma + '\n' + newEntries + '\n' + result.slice(closingIdx);
                                    }
                                }

                                fs.writeFileSync(filePath, result);
                            } catch { /* skip on error */ }
                        }
                    };

                    applyPartialMerge(enSnapshots, changedKeys);
                    applyPartialMerge(zhTWSnapshots, changedKeys);
                }

                const rootChanges = await diffProcess("**/assets/locale/*.json", ["-w", "--name-only"]);
                const baseChanges = await diffProcess("**/assets/locale/*.json", ["-w", "--name-only"], path.join(vscode.workspace.rootPath??'', config.modulePath));
                
                vscode.window.showInformationMessage(`sync finished \n${rootChanges}\n${baseChanges}`);
            } catch (err) {
                ErrorHandler.handleError(err);
            }
        },
        `Downloading translations...`
    );
};
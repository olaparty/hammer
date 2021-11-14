import * as path from 'path';
import * as vscode from 'vscode';
import * as util from 'util';
import * as glob from 'glob';
import { CrowdinClient } from '../../client/crowdinClient';
import { ErrorHandler } from '../../util/errorHandler';
import { SourceFiles } from '../../model/sourceFiles';
import { CrowdinConfigHolder } from '../crowdinConfigHolder';
import { CommonUtil } from '../../util/commonUtil';

const asyncGlob = util.promisify(glob);

export const downloadTranslation = (configHolder: CrowdinConfigHolder) => {
    return CommonUtil.withProgress(
        async () => {
            try {
                Array.from(configHolder.configurations)
                    .map(async ([config, workspace]) => {
                        const root = !!config.basePath ? path.join(workspace.uri.fsPath, config.basePath) : workspace.uri.fsPath;
                        const promises = config.files
                            .map(async f => {
                                
                                let foundFiles = await asyncGlob(f.source, { cwd:root, root: root });
                                const sourceFiles: SourceFiles = {
                                    files: foundFiles,
                                    sourcePattern: f.source,
                                    translationPattern: f.translation
                                };
                                return sourceFiles;
                            });
                        const client = new CrowdinClient(
                            config.projectId, config.apiKey, config.branch, config.organization
                        );
                        const sourceFilesArr = await Promise.all(promises);
                        client.download(path.join(root, 'build'), sourceFilesArr);
                    });
            } catch (err) {
                ErrorHandler.handleError(err);
            }
        },
        `Downloading translations...`
    );
};
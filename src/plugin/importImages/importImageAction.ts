import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as cp from "child_process";
import { PathUtil } from '../../util/pathUtil';
import { Constants } from '../../constants';
import { Document } from 'yaml';
import { CommonUtil } from '../../util/commonUtil';

const imagesRelativePath = 'assets/images/';


class ImportImageAction {
    constructor(
        private workspaceRoot: string,
        private args: any,
    ) { }
    async run() {
        let editor = vscode.window.activeTextEditor;
        if (!editor) {
            return; // No open text editor
        }

        if (path.extname(editor.document.uri.path) !== '.dart') {
            vscode.window.showInformationMessage('active document is not dart file');
            return;
        }

        let imageName: string | undefined;
        let packageName: string | undefined;

        const selection = editor.selection;
        const selectedText = editor.document.getText(new vscode.Range(selection.anchor, selection.active));
        if (selectedText.length == 0) {
            imageName = await vscode.window.showInputBox({ placeHolder: `Enter the image name` }) ?? '';
            packageName = CommonUtil.getCurrentPackageName();
        } else {
            // get image name
            let regex = /(?<=['"])(.+)(?=['"])/g;
            const imageNameReg = regex.exec(selectedText);
            if (imageNameReg && imageNameReg.length > 0) {
                imageName = imageNameReg[0].replace(/[\r\n\s\ ]/g, "");
            }

            // get package name
            regex = /(?<=ComponentManager.)(.+)(\s*)(?=\))/g;
            const packageNameReg = regex.exec(selectedText);
            if (packageNameReg && packageNameReg.length > 0) {
                packageName = packageNameReg[0].replace(/[\r\n\s\ ]/g, '').replace('MANAGER_', '').toLowerCase();
            }
        }

        if (!imageName || imageName.length == 0) {
            vscode.window.showInformationMessage('image name is undefined');
            return;
        }
        if (!packageName || packageName.length == 0) {
            vscode.window.showInformationMessage('package name is undefined');
            return;
        }

        // select image file
        const dialogOptions: vscode.OpenDialogOptions = { defaultUri: vscode.Uri.parse('~/Downloads/') };
        dialogOptions.filters = { 'Images': ['png', 'webp', 'jpg', 'jpeg', 'svg'] };
        const dialogRes = await vscode.window.showOpenDialog(dialogOptions);
        if (dialogRes == undefined || dialogRes.length == 0) {
            return;
        }
        let filePath = (dialogRes as vscode.Uri[])[0].path;

        // asset/images dir
        const imagesDirPath = packageName == undefined ? `${this.workspaceRoot}/assets/images` : `${this.workspaceRoot}/common_base/${packageName}/assets/images`;

        // select sub image dir
        const subImgDirs: string[] = ['.'];
        const subImgDirNameFunc = fs.readdirSync(imagesDirPath);
        subImgDirNameFunc.forEach(function (subDirName) {
            const subDir = path.join(imagesDirPath, subDirName);
            if (fs.statSync(subDir).isDirectory()) {
                subImgDirs.push(packageName == undefined ? subDirName : `${packageName}/${subDirName}`);
            }
        });
        let subImgDir: string | undefined;
        if (subImgDirs.length > 1) {
            subImgDir = await vscode.window.showQuickPick(subImgDirs);
        }

        // destination dir
        const destinationPath = ((subImgDir != undefined && subImgDir != '.') ? path.join(imagesDirPath, subImgDir) : imagesDirPath) + '/' + imageName;

        // pre script
        let compressScript = vscode.workspace.getConfiguration().get<string>(Constants.COMPRESS_IMAGE_SCRIPT);
        if (compressScript != null && compressScript.length > 0) {
            const scriptOutDir = path.dirname(filePath);
            compressScript = compressScript.replace('$inFilePath$', filePath);
            compressScript = compressScript.replace('$outinFilePath$', scriptOutDir);
            const shellScript = await vscode.window.showQuickPick([compressScript, 'skip']);
            if (shellScript != 'skip') {
                const result = cp.execSync(compressScript).toString("utf8").trim();
                filePath = filePath.replace(path.extname(filePath), '.webp');
            }
        }

        // rename and copy image file
        fs.writeFileSync(destinationPath, fs.readFileSync(filePath));
    }
}


export async function importImage(args: any) {
    await new ImportImageAction(vscode.workspace.rootPath ?? '', args).run();
}

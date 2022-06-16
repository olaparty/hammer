import { ChildProcess, spawn } from "child_process";
import { dirname, join } from "path";
import * as vscode from 'vscode';
import { extensions } from "vscode";
import { validEditor } from "./editorvalidator";
import { getProperty } from "./property";
import { Logger } from "./logger";
import { execute } from "./execcommand";
import { GitExtension } from "../typings/git";
import { getActiveTextEditor } from "./get-active";

export const getGitCommand = (): string => {
    const vscodeGit = extensions.getExtension<GitExtension>("vscode.git");

    if (vscodeGit?.exports.enabled) {
        return vscodeGit.exports.getAPI(1).git.path;
    }

    return "git";
}

const runGit = (
    cwd: string,
    ...args: string[]
): Promise<string> => execute(getGitCommand(), args, { cwd: dirname(cwd) });

const runGitRaw = (
    cwd: string,
    ...args: string[]
): Promise<string> => execute(getGitCommand(), args, { cwd: cwd });

export const getActiveFileOrigin = async (remoteName: string): Promise<string> => {
    const activeEditor = getActiveTextEditor();

    if (!validEditor(activeEditor)) {
        return "";
    }

    return runGit(activeEditor.document.fileName, "ls-remote", "--get-url", remoteName);
}

export const getRemoteUrl = async (fallbackRemote: string): Promise<string> => {
    const activeEditor = getActiveTextEditor();

    if (!validEditor(activeEditor)) {
        return "";
    }

    const { fileName } = activeEditor.document;
    const currentBranch = await runGit(fileName, "symbolic-ref", "-q", "--short", "HEAD");
    const curRemote = await runGit(fileName, "config", `branch.${ currentBranch }.remote`);
    return runGit(fileName, "config", `remote.${ curRemote || fallbackRemote }.url`);
}

export const isGitTracked = async (
    fileName: string,
): Promise<boolean> => !!await runGit(fileName, "rev-parse", "--git-dir");

export const diffProcess = async (fileName: string, args?: ReadonlyArray<string>,  cwd?: string | undefined): Promise<string> => {
    if(!cwd){
        cwd = vscode.workspace.rootPath;
    }
    if(!cwd) {
        return "";
    }
    if(!args) {
        args = [];
    }

    args = ["diff", ...args, fileName];

    return await runGitRaw(cwd, ...args);
}

export const blameProcess = (fileName: string): ChildProcess => {
    const args = ["blame", "--incremental", "--", fileName];

    if (getProperty("ignoreWhitespace")) {
        args.splice(1, 0, "-w");
    }

    Logger.write("command", `${getGitCommand()} ${args.join(" ")}`);

    return spawn(getGitCommand(), args, {
        cwd: dirname(fileName),
    });
}

export const getRelativePathOfActiveFile = async (): Promise<string> => {
    const activeEditor = getActiveTextEditor();

    if (!validEditor(activeEditor)) {
        return "";
    }

    const { fileName } = activeEditor.document;
    return runGit(fileName, "ls-files", "--full-name", "--", fileName);
}


export const isActiveFileNewAdded = async (): Promise<Boolean> => {
    const activeEditor = getActiveTextEditor();

    if (!validEditor(activeEditor)) {
        return false;
    }

    const { fileName } = activeEditor.document;
    const baseFileName = fileName.replace(`${vscode.workspace.rootPath ?? ''}/`, '');
    const gitStatus: string =  await runGit(fileName, "status", "--porcelain") ?? '';
    const results = gitStatus.split('\n').find((value) => `A ${baseFileName}` === value || `?? ${baseFileName}` === value);


    return results != undefined;
}
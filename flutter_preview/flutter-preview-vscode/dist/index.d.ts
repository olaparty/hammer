import * as vscode from 'vscode';

declare class FlutterPreviewVSCode {
    readonly namespace: string;
    private get commandId();
    constructor({ namespace }: {
        namespace: string;
    });
    attatch(context: vscode.ExtensionContext): void;
    detach(): void;
}

export { FlutterPreviewVSCode as default };

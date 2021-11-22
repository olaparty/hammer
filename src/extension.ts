import * as vscode from 'vscode';
import { Constants } from './constants';
import { CrowdinConfigHolder } from './plugin/crowdinConfigHolder';
import { ProgressTreeProvider } from './plugin/progress/progressTreeProvider';
import { LocalTranslationsProvider } from './plugin/translations/localTranslationsProvider';
import { downloadTranslation, openSearchTranslations } from './plugin/translations/downloadTranslationsCommand';
import { Diagnostics } from './plugin/diagnostics/diagnostics';

export async function activate(context: vscode.ExtensionContext) {
    Constants.initialize(context);

    const diagnostics = new Diagnostics();
    const configHolder = new CrowdinConfigHolder();
    const progressProvider = new ProgressTreeProvider(configHolder);
    const localTranslationsProvider = new LocalTranslationsProvider(vscode.workspace.rootPath);

    configHolder.addListener(() => progressProvider.refresh());
    configHolder.load();

    vscode.window.registerTreeDataProvider('translationProgress', progressProvider);
    vscode.window.registerTreeDataProvider('localTranslations', localTranslationsProvider);

    vscode.commands.registerCommand(Constants.OPEN_TMS_FILE_COMMAND, fsPath => vscode.commands.executeCommand('vscode.open', vscode.Uri.file(fsPath)));

    vscode.commands.registerCommand('localTranslations.showEntry', args => localTranslationsProvider.showEntry(args));
    vscode.commands.registerCommand('localTranslations.create', args => localTranslationsProvider.addEntry());
    vscode.commands.registerCommand('localTranslations.download', () => downloadTranslation(configHolder));
    vscode.commands.registerCommand('localTranslations.search', () => openSearchTranslations());

    vscode.commands.registerCommand('translationProgress.refresh', () => progressProvider.refresh());


    diagnostics.init(context);

    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration(Constants.AUTO_REFRESH_PROPERTY)) {
            configHolder.load();
        }
    }));

    // Ensure we have a Dart extension.
    const dartExt = vscode.extensions.getExtension('Dart-Code.dart-code');
    if (!dartExt) {
        // This should not happen since the Flutter extension has a dependency on the Dart one
        // but just in case, we'd like to give a useful error message.
        throw new Error("The Dart extension is not installed, Flutter extension is unable to activate.");
    }
    await dartExt.activate();

    context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection( e => {
        if (e.selections && e.selections.length) {
            const flutterOutlineTreeProvider = dartExt.exports._privateApi.flutterOutlineTreeProvider;
            const node = flutterOutlineTreeProvider!.getNodeAt(e.textEditor.document.uri, e.selections[0].start);
            console.log(node);
        }
    }));
}

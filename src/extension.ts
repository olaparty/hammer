import * as vscode from 'vscode';
import { Constants } from './constants';
import { CrowdinConfigHolder } from './plugin/crowdinConfigHolder';
import { ProgressTreeProvider } from './plugin/progress/progressTreeProvider';
import { LocalTranslationsProvider } from './plugin/translations/localTranslationsProvider';
import { downloadTranslation, openSearchTranslations } from './plugin/translations/downloadTranslationsCommand';

export function activate(context: vscode.ExtensionContext) {
	Constants.initialize(context);

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
	
	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
		if (e.affectsConfiguration(Constants.AUTO_REFRESH_PROPERTY)) {
			configHolder.load();
		}
	}));
}

type VSCodeCommand = VSCodeOpenExternalCommand;
type VSCodeNotification = NotifyVSCodeThatAppIsReady;
interface VSCodeOpenExternalCommand {
    command: "vscode.env.openExternal";
    target: string;
}
interface NotifyVSCodeThatAppIsReady {
    event: "webview-ready";
}
type Action = HotRestartAction | WebLaunchUrlAction | DaemonStartupLog | AppStopAction;
type ActionType = Action["type"];
interface HotRestartAction {
    type: "hot-restart";
}
interface WebLaunchUrlAction {
    type: "web-launch-url";
    url: string;
}
interface DaemonStartupLog {
    type: "daemon-startup-log";
    message: string;
}
interface AppStopAction {
    type: "app.stop";
    error?: string;
}
declare function appurl(initial?: {
    webLaunchUrl?: string;
} | null, baseurl?: string): string;

export { Action, ActionType, AppStopAction, DaemonStartupLog, HotRestartAction, NotifyVSCodeThatAppIsReady, VSCodeCommand, VSCodeNotification, VSCodeOpenExternalCommand, WebLaunchUrlAction, appurl };

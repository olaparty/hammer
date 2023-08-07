import * as vscode from "vscode";
import FlutterPreviewVSCode from "@vscode.grida.co/flutter-preview";

const flutterPreview = new FlutterPreviewVSCode({
  namespace: "hammer",
});

export default function activate(context: vscode.ExtensionContext) {
  flutterPreview.attatch(context);
}

export function deactivate() {
  flutterPreview.detach();
}

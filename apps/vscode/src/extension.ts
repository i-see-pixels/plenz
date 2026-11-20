import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "plenz.refine",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const selection = editor.selection;
        const text = editor.document.getText(selection);
        vscode.window.showInformationMessage(
          `Refining: ${text.substring(0, 20)}...`,
        );
        // Implementation using @plenz/core would go here
      }
    },
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}

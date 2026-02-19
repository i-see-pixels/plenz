import * as vscode from "vscode"
import { SYSTEM_PROMPT_TEMPLATE } from "@promptlens/core"

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand(
		"promptlens.refine",
		async () => {
			const editor = vscode.window.activeTextEditor
			if (editor) {
				const selection = editor.selection
				const text = editor.document.getText(selection)
				vscode.window.showInformationMessage(
					`Refining: ${text.substring(0, 20)}...`,
				)
				// Implementation using @promptlens/core would go here
			}
		},
	)

	context.subscriptions.push(disposable)
}

export function deactivate() {}

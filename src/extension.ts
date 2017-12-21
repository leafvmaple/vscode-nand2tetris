"use strict";
import { join, parse } from "path";
import * as vscode from "vscode";
import { Commands } from "./commands";

const commands = new Commands();

export function activate(context: vscode.ExtensionContext) {
    const run = vscode.commands.registerCommand("nand2tetris.run", (fileUri: vscode.Uri) => {
        const editor = vscode.window.activeTextEditor;
        const filePath = parse(editor.document.fileName);
        const fileName = join(filePath.dir, filePath.name + ".tst");
        commands.executeCommand(fileName);
    });

    context.subscriptions.push(run);
    context.subscriptions.push(commands);
}

export function deactivate() {
    commands.stopCommand();
}
